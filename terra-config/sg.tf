# Single Security Group for the project
resource "aws_security_group" "ecs_sg" {
  name        = "${var.project_name}-sg"
  description = "Security Group for ${var.project_name}"
  vpc_id      = module.vpc.vpc_id

  tags = merge(local.common_tags, { Name = "${var.project_name}-sg" })
}

# Dynamic ingress rules — just add entries to var.ingress_rules
resource "aws_security_group_rule" "ingress_rules" {
  for_each = { for r in var.ingress_rules : "${r.port}-${r.desc}" => r }

  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  cidr_blocks       = each.value.cidrs
  description       = each.value.desc
  security_group_id = aws_security_group.ecs_sg.id
}

# Allow all outbound traffic
resource "aws_security_group_rule" "egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ecs_sg.id
}
