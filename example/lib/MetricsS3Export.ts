import { Construct, CfnResource, Aws, RemovalPolicy } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3' 
var packageJson = require('../../package.json')

export class MetricsS3Export extends Construct {
  constructor(parent: Construct, id: string) {
    super(parent, id);
    this.create(parent);
  }

  private create(construct: Construct) {

    const bucket = new Bucket(this,'exportBucket', {
      removalPolicy: RemovalPolicy.DESTROY
    })

    const metricFilter = [
      { metricName: 'CallCount', dimensions: [{ name: 'Service', value:'CloudWatch' }, {name: 'Resource', value: 'DescribeAlarms'}, {name: 'Type', value: 'API'}, {name: 'Class', value: 'None'}], nameSpace: 'AWS/Usage' },
      { metricName: 'NumberOfObjects', dimensions: [{ name: 'BucketName', value: bucket.bucketName }, {name: 'StorageType', value: 'AllStorageTypes'}], nameSpace: 'AWS/S3' },
      { metricName: 'MTTR', dimensions: [{ name: 'account', value: Aws.ACCOUNT_ID }], nameSpace: 'Operations' },
    ];

    new CfnResource(this, 'MetricsS3Export', {
      properties: {
        Location: {
          ApplicationId:
            'arn:aws:serverlessrepo:us-east-1:611781478414:applications/mechanicalrock-aws-metrics-s3-export',
          SemanticVersion: packageJson.version,
        },
        Parameters: {
          MetricFilter: JSON.stringify(metricFilter),
          ExportBucketName: bucket.bucketName,
          MetricsExportPriod: 'WEEKLY',
        },
      },
      type: 'AWS::Serverless::Application',
    });

  }
}
