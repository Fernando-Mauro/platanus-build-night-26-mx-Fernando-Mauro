import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

interface AuthStackProps extends cdk.StackProps {
  /** ALB base URL (http://...) for OAuth callback/logout URLs. */
  appBaseUrl?: string;
}

/**
 * T005 — Amazon Cognito for real user auth.
 * User Pool (email sign-in + verification) + confidential App Client (secret used
 * server-side by Auth.js) + Identity Pool federating the pool. Client secret is
 * exposed as a stack output reference; AppStack reads it into the Fargate task.
 */
export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly issuerUrl: string;
  /** Cognito app-client secret, stored in Secrets Manager for the Fargate task. */
  public readonly clientSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: AuthStackProps = {}) {
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

    // ---- App Client (confidential — has a secret, used by Auth.js server-side) ----
    const callbackBase = props.appBaseUrl ?? "http://localhost:3000";
    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: "Vertice-WebClient",
      generateSecret: true,
      authFlows: { userPassword: true, userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          `${callbackBase}/api/auth/callback/cognito`,
          "http://localhost:3000/api/auth/callback/cognito",
        ],
        logoutUrls: [callbackBase, "http://localhost:3000"],
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

    // Store the confidential client secret in Secrets Manager (Principle II) so
    // the Fargate task can read it without it ever touching the repo/bundle.
    this.clientSecret = new secretsmanager.Secret(this, "CognitoClientSecret", {
      secretStringValue: this.userPoolClient.userPoolClientSecret,
    });

    this.issuerUrl = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`;

    // ---- Outputs (consumed by AppStack) ----
    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "IdentityPoolId", { value: this.identityPool.ref });
    new cdk.CfnOutput(this, "CognitoIssuerUrl", { value: this.issuerUrl });
  }
}
