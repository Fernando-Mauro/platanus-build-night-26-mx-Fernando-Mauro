import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

interface AppStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  fargateSg: ec2.ISecurityGroup;
  dbInstance: rds.DatabaseInstance;
  dbSecret: secretsmanager.ISecret;
  judge0PrivateIp: string;
  judge0Secret: secretsmanager.ISecret;
}

/**
 * T019 — Next.js container on ECS Fargate behind an internet-facing ALB.
 * Tasks run in private subnets with `fargateSg`; the image is built from the
 * repo Dockerfile and pushed to an auto-managed ECR repo at deploy time.
 * All secrets are injected from Secrets Manager (Principle II); the task role is
 * scoped to read only the two app secrets.
 */
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "Cluster", { vpc: props.vpc });

    // App-level secret: the Auth.js session secret.
    const appSecret = new secretsmanager.Secret(this, "AppSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "authSecret",
        excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\",
        passwordLength: 44,
      },
    });

    const image = ecs.ContainerImage.fromAsset(path.join(__dirname, "..", ".."), {
      file: "Dockerfile",
    });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "Service",
      {
        cluster,
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
        publicLoadBalancer: true,
        securityGroups: [props.fargateSg],
        taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        taskImageOptions: {
          image,
          containerPort: 3000,
          environment: {
            NODE_ENV: "production",
            DB_HOST: props.dbInstance.dbInstanceEndpointAddress,
            DB_PORT: "5432",
            DB_NAME: "vertice",
            JUDGE0_URL: `http://${props.judge0PrivateIp}:2358`,
          },
          secrets: {
            DB_USERNAME: ecs.Secret.fromSecretsManager(props.dbSecret, "username"),
            DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, "password"),
            JUDGE0_AUTHN_TOKEN: ecs.Secret.fromSecretsManager(props.judge0Secret, "token"),
            AUTH_SECRET: ecs.Secret.fromSecretsManager(appSecret, "authSecret"),
          },
        },
      }
    );

    // ALB target health: use the static login page (always 200). /api/ping is for
    // the human skeleton check and may report 503 while Judge0 warms up.
    service.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200",
      interval: cdk.Duration.seconds(30),
    });

    new cdk.CfnOutput(this, "AlbUrl", {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`,
      description: "Public ALB URL — open /api/ping to validate the skeleton",
    });
  }
}
