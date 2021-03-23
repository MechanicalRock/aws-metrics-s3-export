# aws-metrics-s3-export
Serverless application repository to allow cloudwatch metrics export to s3

## Parameters

| Parameter           | Description                                                     |
|---------------------|-----------------------------------------------------------------|
| PermissionsBoundary | (optional) ARN of a permissions boundary to apply to all roles  |
| MetricFilter        | JSON string array of metric filters to apply (see below)        |
| ExportBucketName    | BucketName where the metrics result will be exported to         |
| MetricsExportPeriod  | Metrics export period, WEEKLY, FORTNIGHTLY, MONTHLY              |

## Getting Started

See the `example` directory for a sample deployment:

Configure your [AWS CLI credentials](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_credentials)

```
cd example
npm install
npm run deploy
```

## MetricFilter

The `MetricFilter` parameter is used to construct a CloudWatch `MetricDataQueries` object, to query for metrics you wish to export.

The parameter should contain a JSON string `MetricFilters` conforming to the following schema:
```
type MetricFilters = MetricFilter[]

interface MetricFilter {
  metricName: string,
  nameSpace: string,
  dimensions?: MetricFilterDimension[]
}

interface MetricFilterDimension {
  name: string,
  value: string
}
```

For example:

```
[{ "metricName" : "ConcurrentExecutions", "nameSpace" : "AWS/Lambda"}, { "metricName" : "IncomingBytes", "nameSpace" : "AWS/Logs"}]
```

Will query CloudWatch Metrics for:

```
[{ "Id": "m0", "MetricStat": { "Metric": { "MetricName": "ConcurrentExecutions", "Namespace": "AWS/Lambda" }, "Period": 10, "Stat": "Average" } }]
```

See also: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Metric.html
