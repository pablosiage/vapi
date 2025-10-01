import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigatewayv2Integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class VapiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const reportsTable = new dynamodb.Table(this, 'VapiReports', {
      tableName: 'vapi_reports',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const confirmationsTable = new dynamodb.Table(this, 'VapiConfirmations', {
      tableName: 'vapi_confirmations',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const parkingSessionsTable = new dynamodb.Table(this, 'VapiParkingSessions', {
      tableName: 'vapi_parking_sessions',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'VapiUserPool', {
      userPoolName: 'vapi-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'VapiUserPoolClient', {
      userPool,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      generateSecret: false,
    });

    // Identity Pool for anonymous access
    const identityPool = new cognito.CfnIdentityPool(this, 'VapiIdentityPool', {
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName,
      }],
    });

    // IAM roles for authenticated/unauthenticated users
    const unauthenticatedRole = new iam.Role(this, 'UnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'unauthenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity'),
    });

    const authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity'),
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
    });

    // Lambda function for API operations
    const apiLambda = new lambda.Function(this, 'VapiApiLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        REPORTS_TABLE: reportsTable.tableName,
        CONFIRMATIONS_TABLE: confirmationsTable.tableName,
        PARKING_SESSIONS_TABLE: parkingSessionsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Lambda function for WebSocket operations
    const wsLambda = new lambda.Function(this, 'VapiWsLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'websocket.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        REPORTS_TABLE: reportsTable.tableName,
        REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant DynamoDB permissions
    reportsTable.grantReadWriteData(apiLambda);
    confirmationsTable.grantReadWriteData(apiLambda);
    parkingSessionsTable.grantReadWriteData(apiLambda);
    reportsTable.grantReadData(wsLambda);

    // REST API Gateway
    const api = new apigateway.RestApi(this, 'VapiRestApi', {
      restApiName: 'Vapi REST API',
      description: 'REST API for Vapi parking app',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'VapiAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const integration = new apigateway.LambdaIntegration(apiLambda);

    // API Routes
    const reports = api.root.addResource('report');
    reports.addMethod('POST', integration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const confirm = api.root.addResource('confirm');
    confirm.addMethod('POST', integration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const nearby = api.root.addResource('nearby');
    nearby.addMethod('GET', integration);

    const park = api.root.addResource('park');
    const parkStart = park.addResource('start');
    parkStart.addMethod('POST', integration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const parkEnd = park.addResource('end');
    parkEnd.addMethod('POST', integration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const me = api.root.addResource('me');
    const mePark = me.addResource('park');
    mePark.addMethod('GET', integration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // WebSocket API Gateway
    const wsApi = new apigatewayv2.WebSocketApi(this, 'VapiWebSocketApi', {
      apiName: 'Vapi WebSocket API',
      description: 'WebSocket API for real-time updates',
      connectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration('ConnectIntegration', wsLambda),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration('DisconnectIntegration', wsLambda),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration('DefaultIntegration', wsLambda),
      },
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, 'VapiWebSocketStage', {
      webSocketApi: wsApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Grant WebSocket API permissions to Lambda
    wsLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [`${wsApi.apiArn}/*/*`],
    }));

    // Outputs
    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: api.url,
      description: 'REST API Gateway URL',
    });

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: `${wsApi.apiEndpoint}/${wsStage.stageName}`,
      description: 'WebSocket API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });
  }
}