aws_region           = "us-east-1"
project_name         = "tetris-ecs-deploy"
environment          = "dev"
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
ingress_rules = [
  { port = 80, cidrs = ["0.0.0.0/0"], desc = "Public HTTP" },
  { port = 443, cidrs = ["0.0.0.0/0"], desc = "Public HTTPS" }
]
ecr_names = {
  tetris-app = {
    repo_name = "tetris/tetris-app"
    tag       = "tetris-app-latest"
  }
}
log_group_name     = "/ecs/tetris-cluster"
log_retention_days = 7
github_repo        = "iam-surya369/tetris-ecs-deploy"
