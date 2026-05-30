import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * T005 — Amazon Cognito for real user auth (Credentials-flow variant).
 *
 * The web app authenticates with Cognito via the AWS SDK (USER_PASSWORD_AUTH /
 * SignUp / ConfirmSignUp) from Auth.js's Credentials provider — NOT the OAuth
 * authorization-code redirect. That avoids Cognito's hard requirement that OAuth
 * callback URLs use HTTPS (our ALB is HTTP), which previously caused the App
 * Client creation to fail and roll back the whole stack.
 *
 * Resources: User Pool (email sign-in + verification) + a PUBLIC App Client
 * (no secret, USER_PASSWORD_AUTH enabled — server-side credential flow) + an
 * Identity Pool federating the pool (per the requirement).
 */
export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly issuerUrl: string;

  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    // ---- User Pool ----
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "Vertice-Users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // hackathon; revisit for prod
    });

    // ---- App Client (PUBLIC — no secret; USER_PASSWORD_AUTH for server-side
    // credential flow). No oAuth block → no HTTPS callback requirement. ----
    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: "Vertice-WebClient",
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // ---- Identity Pool (federates the User Pool) ----
    this.identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      identityPoolName: "Vertice-Identities",
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Authenticated role for the Identity Pool (least privilege — no extra AWS access for the demo).
    const authedRole = new iam.Role(this, "IdentityAuthedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: { "cognito-identity.amazonaws.com:aud": this.identityPool.ref },
          "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "authenticated" },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });
    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoles", {
      identityPoolId: this.identityPool.ref,
      roles: { authenticated: authedRole.roleArn },
    });

    this.issuerUrl = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`;

    // ---- Outputs (consumed by AppStack) ----
    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "IdentityPoolId", { value: this.identityPool.ref });
    new cdk.CfnOutput(this, "CognitoIssuerUrl", { value: this.issuerUrl });
  }
}
