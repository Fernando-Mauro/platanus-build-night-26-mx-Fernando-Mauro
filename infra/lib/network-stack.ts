import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * T014 — VPC + security groups.
 * Two AZs, public subnets (ALB + NAT) and private-with-egress subnets (Fargate,
 * RDS, Judge0). RDS and Judge0 get empty-ingress SGs here; the rule allowing the
 * Fargate service is declared in the App stack (as CfnSecurityGroupIngress) so
 * the cross-stack dependency stays one-directional (App→Network) and avoids a
 * cyclic reference (Constitution Principle III — isolation, no public ingress).
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
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

    // RDS: ingress 5432 added later from the App stack (Fargate service SG only).
    this.rdsSg = new ec2.SecurityGroup(this, "RdsSg", {
      vpc: this.vpc,
      description: "RDS PostgreSQL — Fargate service only",
      allowAllOutbound: true,
    });

    // Judge0 EC2: ingress 2358 added later from the App stack.
    this.judge0Sg = new ec2.SecurityGroup(this, "Judge0Sg", {
      vpc: this.vpc,
      description: "Judge0 EC2 — Fargate service only",
      allowAllOutbound: true,
    });
  }
}
