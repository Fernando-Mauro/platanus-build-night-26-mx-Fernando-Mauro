#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { DataStack } from "../lib/data-stack";
import { Judge0Stack } from "../lib/judge0-stack";
import { AuthStack } from "../lib/auth-stack";
import { AppStack } from "../lib/app-stack";

const app = new cdk.App();

// Account/region come from the operator's environment (input #4: AWS creds already
// configured locally). No hardcoded account/region.
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// ALB base URL for Cognito OAuth callback/logout. Passed as a plain string (context
// or env) so AuthStack does NOT depend on AppStack — avoids a Cognito↔App cycle.
// After the first App deploy, set ALB_URL to the real ALB URL and redeploy Auth.
const albUrl = app.node.tryGetContext("albUrl") || process.env.ALB_URL;

const network = new NetworkStack(app, "Vertice-Network", { env });

const auth = new AuthStack(app, "Vertice-Auth", { env, appBaseUrl: albUrl });

const data = new DataStack(app, "Vertice-Data", {
  env,
  vpc: network.vpc,
  rdsSg: network.rdsSg,
});

const judge0 = new Judge0Stack(app, "Vertice-Judge0", {
  env,
  vpc: network.vpc,
  judge0Sg: network.judge0Sg,
});

new AppStack(app, "Vertice-App", {
  env,
  vpc: network.vpc,
  rdsSg: network.rdsSg,
  judge0Sg: network.judge0Sg,
  dbInstance: data.instance,
  dbSecret: data.secret,
  judge0PrivateIp: judge0.privateIp,
  judge0Secret: judge0.secret,
  cognitoIssuer: auth.issuerUrl,
  cognitoUserPoolId: auth.userPool.userPoolId,
  cognitoClientId: auth.userPoolClient.userPoolClientId,
  cognitoClientSecret: auth.clientSecret,
});

app.synth();
