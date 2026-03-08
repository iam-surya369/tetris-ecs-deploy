variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "project_name" {
  type    = string
  default = "web-app"
}
variable "environment" {
  type    = string
  default = "dev"
}
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}
variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}
variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.11.0/24", "10.0.12.0/24"]
}
variable "ingress_rules" {
  description = "List of ingress rules for the security group"
  type = list(object({
    port  = number
    cidrs = list(string)
    desc  = string
  }))
  default = []
}
variable "ecr_names" {
  description = "ECR repository names keyed by service (nodejs, nginx)"
  type = map(object({
    repo_name = string
    tag       = string
  }))
  default = {
    tetris-app = { repo_name = "tetris/tetris-app", tag = "tetris-app-latest" }
  }
}
variable "log_group_name" {
  description = "Name of the CloudWatch Log Group"
  type        = string
  default     = "/ecs/tetris-cluster"
}
variable "log_retention_days" {
  description = "Number of days to retain logs in CloudWatch"
  type        = number
  default     = 7
}
variable "github_repo" {
  description = "GitHub repository in org/repo format for OIDC trust policy"
  type        = string
}

