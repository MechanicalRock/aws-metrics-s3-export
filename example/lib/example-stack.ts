import * as cdk from '@aws-cdk/core';
import { MetricsS3Export } from './MetricsS3Export';

export class ExampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new MetricsS3Export(this, 'MetricsExportSAR')

    this.addTransform('AWS::Serverless-2016-10-31')
  }
}
