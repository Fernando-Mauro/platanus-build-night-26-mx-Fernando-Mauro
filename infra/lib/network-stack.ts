import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * T014 — VPC + security groups.
 * Two AZs, public subnets (ALB + NAT) and private-with-egress subnets (Fargate,
 * RDS, Judge0). RDS and Judge0 accept traffic ONLY from the Fargate task SG
 * (Constitution Principle III — strict isolation, no public ingress, no wildcards).
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly fargateSg: ec2.SecurityGroup;
  public readonly rdsSg: ec2.SecurityGroup;
  public readonly judge0Sg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    // Fargate tasks. Egress open (to reach RDS, Judge0, ECR via NAT).
    this.fargateSg = new ec2.SecurityGroup(this, "FargateSg", {
      vpc: this.vpc,
      description: "ECS Fargate tasks (Next.js app)",
      allowAllOutbound: true,
    });

    // RDS: ingress 5432 ONLY from the Fargate task SG.
    this.rdsSg = new ec2.SecurityGroup(this, "RdsSg", {
      vpc: this.vpc,
      description: "RDS PostgreSQL — Fargate only",
      allowAllOutbound: true,
    });
    this.rdsSg.addIngressRule(
      this.fargateSg,
      ec2.Port.tcp(5432),
      "Postgres from Fargate tasks only"
    );

    // Judge0 EC2: ingress 2358 ONLY from the Fargate task SG.
    this.judge0Sg = new ec2.SecurityGroup(this, "Judge0Sg", {
      vpc: this.vpc,
      description: "Judge0 EC2 — Fargate only",
      allowAllOutbound: true,
    });
    this.judge0Sg.addIngressRule(
      this.fargateSg,
      ec2.Port.tcp(2358),
      "Judge0 API from Fargate tasks only"
    );
  }
}
