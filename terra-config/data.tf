data "aws_availability_zones" "available" {
  state = "available"
}

# data "aws_ami" "ubuntu" {
#   most_recent = true
#   owners      = ["amazon"]
#   filter {
#     name   = "name"
#     values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
#   }
# }

# # Look up the existing key by name
# data "aws_key_pair" "keypair" {
#   key_name = "devops" # The exact name in the AWS Console
# }

# data "aws_caller_identity" "current" {}
