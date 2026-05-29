import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

interface DataStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  rdsSg: ec2.ISecurityGroup;
}

/**
 * T015 — RDS PostgreSQL in private subnets, credentials auto-generated into
 * Secrets Manager (Principle II: no committed secrets). Not publicly accessible.
 */
export class DataStack extends cdk.Stack {
  public readonly instance: rds.DatabaseInstance;
  public readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // RDS-managed credentials. Exclude characters that would break a URL-form
    // DATABASE_URL so the app entrypoint can interpolate the password safely.
    const credentials = rds.Credentials.fromGeneratedSecret("vertice", {
      excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\=^,.",
    });

    this.instance = new rds.DatabaseInstance(this, "Db", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.rdsSg],
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      credentials,
      databaseName: "vertice",
      allocatedStorage: 20,
      storageEncrypted: true,
      publiclyAccessible: false,
      multiAz: false,
      // Hackathon defaults — destroyable. Harden (RETAIN, deletion protection) for prod.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
      backupRetention: cdk.Duration.days(1),
    });

    this.secret = this.instance.secret!;

    new cdk.CfnOutput(this, "DbEndpoint", {
      value: this.instance.dbInstanceEndpointAddress,
    });
  }
}
