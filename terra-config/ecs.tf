resource "aws_ecs_cluster" "tetris_cluster" {
  name = "${var.project_name}-cluster"
  tags = merge(local.common_tags, {
    Name = "tetris_cluster"
  })
}

resource "aws_ecs_task_definition" "tetris_task_definition" {
  family                   = "tetris-task-definition"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  # The actual container settings (Must be a JSON string)
  container_definitions = jsonencode([
    {
      name = "tetris-container"
      # image     = "${aws_ecr_repository.repos["tetris-app"].repository_url}:${var.ecr_names["tetris-app"].tag}" #ECR Image URL
      image     = "nginx:latest"
      essential = true

      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]

      # Logging
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  depends_on = [aws_ecr_repository.repos]
}

resource "aws_ecs_service" "tetris_service" {
  name            = "tetris-service"
  cluster         = aws_ecs_cluster.tetris_cluster.id
  task_definition = aws_ecs_task_definition.tetris_task_definition.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  # REQUIRED for Fargate
  network_configuration {
    subnets          = module.vpc.public_subnets
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true # Set to true if in a public subnet, false if private
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}
