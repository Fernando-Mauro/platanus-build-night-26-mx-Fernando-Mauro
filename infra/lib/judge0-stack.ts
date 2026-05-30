import * as fs from "fs";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

interface Judge0StackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  judge0Sg: ec2.ISecurityGroup;
}

const JUDGE0_VERSION = "1.13.1";

/**
 * T016 — Judge0 on a private EC2 instance (Ubuntu 22.04, t3.medium).
 * The AUTHN_TOKEN is generated into Secrets Manager; the instance role can read
 * only that secret + SSM (Session Manager — no inbound SSH). User-data enables
 * cgroup v1, reboots, then starts Judge0 (T017).
 */
export class Judge0Stack extends cdk.Stack {
  public readonly privateIp: string;
  public readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: Judge0StackProps) {
    super(scope, id, props);

    // Judge0 API auth token (random), stored as { "token": "..." }.
    this.secret = new secretsmanager.Secret(this, "Judge0Secret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "token",
        excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\",
        passwordLength: 40,
      },
    });

    const role = new iam.Role(this, "Judge0InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });
    this.secret.grantRead(role); // scoped read of just this secret (no wildcards)

    // Build user-data from the script with placeholders substituted.
    const raw = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "judge0-userdata.sh"),
      "utf8"
    );
    const script = raw
      .replace(/__SECRET_ARN__/g, this.secret.secretArn)
      .replace(/__REGION__/g, cdk.Stack.of(this).region)
      .replace(/__JUDGE0_VERSION__/g, JUDGE0_VERSION);
    const userData = ec2.UserData.forLinux();
    userData.addCommands(script);

    const instance = new ec2.Instance(this, "Judge0", {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: props.judge0Sg,
      // Free-Tier-restricted account: only t3.micro/t3.small (x86) are eligible.
      // Spec preferred t3.medium; using t3.small (2 vCPU / 2 GB) to fit Free Tier.
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.SMALL
      ),
      machineImage: ec2.MachineImage.fromSsmParameter(
        "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id",
        { os: ec2.OperatingSystemType.LINUX }
      ),
      role,
      userData,
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });

    this.privateIp = instance.instancePrivateIp;

    new cdk.CfnOutput(this, "Judge0PrivateIp", { value: this.privateIp });
  }
}
