output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnets
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}

output "ecs_cluster_id" {
  value = aws_ecs_cluster.tetris_cluster.id
}

output "ecs_service_id" {
  value = aws_ecs_service.tetris_service.id
}

output "ecr_repository_urls" {
  value = {
    for k, v in aws_ecr_repository.repos : k => v.repository_url
  }
}

output "ecr_repository_names" {
  value = {
    for k, v in aws_ecr_repository.repos : k => v.name
  }
}
