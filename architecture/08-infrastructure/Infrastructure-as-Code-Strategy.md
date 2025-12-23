# Infrastructure as Code Strategy

## 📋 Propósito

Define la estrategia para gestionar infraestructura con **Terraform** (Infrastructure as Code).

## 🎯 IaC Principles

✅ **Version control**: Infra en Git (code review, history)  
✅ **Reproducible**: Recrear infra idéntica en cualquier ambiente  
✅ **Declarative**: Describe estado deseado, no pasos  
✅ **Immutable**: No modificar recursos, reemplazarlos  
✅ **Testable**: Validar cambios antes de apply

---

## 🏗️ Tool: Terraform

**Por qué Terraform**:
✅ Cloud-agnostic (AWS, GCP, Azure)  
✅ Declarativo (HCL language)  
✅ State management  
✅ Mature ecosystem (providers, modules)  
✅ Community support

**Alternativas consideradas**:

- **AWS CloudFormation**: AWS-only, verbose
- **Pulumi**: Code (TypeScript), más complejo
- **Ansible**: Imperative, mejor para config management

---

## 📁 Repository Structure

```
infrastructure/
├── terraform/
│   ├── modules/              # Reusable modules
│   │   ├── eks/              # EKS cluster module
│   │   ├── rds/              # PostgreSQL module
│   │   ├── redis/            # ElastiCache module
│   │   ├── s3/               # S3 bucket module
│   │   └── vpc/              # VPC module
│   │
│   ├── environments/         # Per-environment configs
│   │   ├── staging/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   ├── outputs.tf
│   │   │   └── terraform.tfvars
│   │   │
│   │   └── production/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       ├── outputs.tf
│   │       └── terraform.tfvars
│   │
│   └── global/               # Cross-environment resources
│       ├── iam/              # IAM roles, policies
│       └── route53/          # DNS zones
│
├── kubernetes/               # K8s manifests (Helm charts)
│   ├── services/
│   │   ├── order-service/
│   │   ├── catalog-service/
│   │   └── ...
│   │
│   └── infrastructure/
│       ├── ingress-nginx/
│       ├── prometheus/
│       └── loki/
│
└── scripts/
    ├── deploy.sh
    └── rollback.sh
```

---

## 🔧 Terraform Configuration

### Module Example: EKS Cluster

**File**: `modules/eks/main.tf`

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = var.environment == "production" ? false : true

    security_group_ids = [aws_security_group.cluster.id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = merge(
    var.tags,
    {
      Name        = var.cluster_name
      Environment = var.environment
    }
  )
}

# Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-node-group"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids

  instance_types = var.instance_types
  capacity_type  = var.capacity_type  # ON_DEMAND or SPOT

  scaling_config {
    desired_size = var.desired_size
    max_size     = var.max_size
    min_size     = var.min_size
  }

  update_config {
    max_unavailable = 1
  }

  tags = var.tags
}

# IAM Role for Cluster
resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}
```

**File**: `modules/eks/variables.tf`

```hcl
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "subnet_ids" {
  description = "List of subnet IDs for EKS cluster"
  type        = list(string)
}

variable "instance_types" {
  description = "Instance types for node group"
  type        = list(string)
  default     = ["m5.large"]
}

variable "capacity_type" {
  description = "Capacity type: ON_DEMAND or SPOT"
  type        = string
  default     = "ON_DEMAND"
}

variable "desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

variable "min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 2
}

variable "max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
```

---

### Environment Configuration: Production

**File**: `environments/production/main.tf`

```hcl
terraform {
  backend "s3" {
    bucket         = "ecommerce-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "production"
      ManagedBy   = "terraform"
      Project     = "ecommerce"
    }
  }
}

# VPC
module "vpc" {
  source = "../../modules/vpc"

  environment = "production"
  vpc_cidr    = "10.0.0.0/16"
  azs         = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# EKS Cluster
module "eks" {
  source = "../../modules/eks"

  cluster_name       = "ecommerce-production"
  environment        = "production"
  kubernetes_version = "1.28"

  subnet_ids = module.vpc.private_subnet_ids

  instance_types = ["m5.large"]
  capacity_type  = "ON_DEMAND"

  desired_size = 5
  min_size     = 3
  max_size     = 10
}

# RDS PostgreSQL
module "rds_order" {
  source = "../../modules/rds"

  identifier = "ecommerce-order-db"
  environment = "production"

  engine_version    = "15.4"
  instance_class    = "db.m5.large"
  allocated_storage = 500

  multi_az               = true
  backup_retention_period = 30

  subnet_ids         = module.vpc.database_subnet_ids
  vpc_security_group_ids = [module.vpc.database_sg_id]
}

# ElastiCache Redis
module "redis" {
  source = "../../modules/redis"

  cluster_id  = "ecommerce-redis"
  environment = "production"

  node_type            = "cache.m5.large"
  num_cache_nodes      = 3
  engine_version       = "7.0"

  subnet_group_name = module.vpc.elasticache_subnet_group_name
  security_group_ids = [module.vpc.redis_sg_id]
}

# S3 Buckets
module "s3_images" {
  source = "../../modules/s3"

  bucket_name = "ecommerce-product-images-prod"
  environment = "production"

  enable_versioning = true
  enable_encryption = true

  cors_rules = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "PUT"]
      allowed_origins = ["https://ecommerce.com", "https://admin.ecommerce.com"]
      expose_headers  = ["ETag"]
      max_age_seconds = 3600
    }
  ]
}
```

**File**: `environments/production/terraform.tfvars`

```hcl
aws_region = "us-east-1"

tags = {
  Environment = "production"
  CostCenter  = "engineering"
  Owner       = "devops-team"
}
```

---

## 🔄 Terraform Workflow

### 1. Initialize

```bash
cd terraform/environments/production
terraform init
```

**Qué hace**:

- Descarga providers (aws, kubernetes)
- Configura backend (S3)
- Inicializa modules

---

### 2. Plan

```bash
terraform plan -out=tfplan
```

**Output**:

```
Terraform will perform the following actions:

  # module.eks.aws_eks_cluster.main will be created
  + resource "aws_eks_cluster" "main" {
      + name     = "ecommerce-production"
      + role_arn = (known after apply)
      ...
    }

Plan: 45 to add, 0 to change, 0 to destroy.
```

**Review**: Verificar que cambios son los esperados.

---

### 3. Apply

```bash
terraform apply tfplan
```

**Confirmación**:

```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes
```

**Wait**: Provisioning puede tomar 10-20 min (EKS cluster).

---

### 4. Destroy (Cleanup)

```bash
terraform destroy
```

⚠️ **Cuidado**: Esto elimina TODA la infraestructura.

---

## 🔒 State Management

### Remote State (S3 + DynamoDB)

**Por qué remote state**:
✅ Colaboración (team comparte state)  
✅ Locking (previene conflictos)  
✅ Encryption  
✅ Backup automático

**Setup**:

```hcl
terraform {
  backend "s3" {
    bucket         = "ecommerce-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"  # Para locking
    encrypt        = true
  }
}
```

**DynamoDB table** (para lock):

```hcl
resource "aws_dynamodb_table" "terraform_lock" {
  name           = "terraform-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

---

## 🧪 Testing Infrastructure

### 1. Terraform Validate

```bash
terraform validate
```

Verifica sintaxis HCL.

---

### 2. Terraform Fmt

```bash
terraform fmt -recursive
```

Formatea código consistentemente.

---

### 3. TFLint

```bash
tflint --init
tflint
```

**Checks**:

- Deprecated syntax
- Invalid instance types
- Missing required variables

---

### 4. Checkov (Security Scan)

```bash
checkov -d terraform/
```

**Detects**:

- S3 buckets sin encryption
- Security groups muy abiertos
- IAM policies overpermissive

---

### 5. Terraform Plan (Dry Run)

```bash
terraform plan
```

**Review**:

- No cambios inesperados
- Recursos a crear/modificar/destruir

---

## 📊 Drift Detection

**Problema**: Cambios manuales en AWS Console → Terraform state desincronizado.

**Solución**: Terraform Cloud (automático) o manual check:

```bash
# Detectar drift
terraform plan -refresh-only

# Output muestra diferencias entre state y realidad
```

---

## 🔐 Secrets Management

### AWS Secrets Manager (para secrets sensibles)

```hcl
# Crear secret
resource "aws_secretsmanager_secret" "db_password" {
  name = "production/order-db/password"

  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# Random password generation
resource "random_password" "db_password" {
  length  = 32
  special = true
}
```

**K8s integration** (External Secrets Operator):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: production/order-db/password
```

---

## ✅ IaC Checklist

### Before Apply

- [ ] Terraform fmt ejecutado
- [ ] Terraform validate pasando
- [ ] TFLint sin errores
- [ ] Checkov security scan pasando
- [ ] Terraform plan reviewed
- [ ] Changes aprobados por team lead

### After Apply

- [ ] Resources creados correctamente
- [ ] Health checks pasando
- [ ] Monitoring configurado
- [ ] State committed a S3
- [ ] Documentation actualizada

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
