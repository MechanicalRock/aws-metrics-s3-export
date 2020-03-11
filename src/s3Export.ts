/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-var-requires */
import { ScheduledEvent } from 'aws-lambda';
import { SSM, config, CloudWatch, S3 } from 'aws-sdk';
const moment = require('moment');

config.update({ region: 'ap-southeast-2' });

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Event is: ', event);
  try {
    const ssm = new SSM();
    const s3 = new S3();
    if (process.env.METRICSFILTER) {
      console.log('process.env.METRICSFILTER: ', process.env.METRICSFILTER);
      const metrics = JSON.parse(process.env.METRICSFILTER);
      const startTime = await retrieveStartTime(ssm);
      console.log('Start Time is:', startTime);
      const endTime = new Date();
      console.log('End Time is:', endTime);
      const cw = new CloudWatch();
      const period = 3600;

      const metricData = await getMetricsData(cw, startTime, endTime, period, metrics);
      await storeResultInS3(s3, metricData, event);
      await storeEndTime(ssm, endTime.toString());
    }
  } catch (e) {
    console.log('There was an error: ', e);
    throw e;
  }
}

export async function retrieveStartTime(ssm: SSM): Promise<Date> {
  let startTime;
  const paramStartDate = process.env.SSMPARAMETERNAME
    ? await ssm.getParameter({ Name: process.env.SSMPARAMETERNAME }).promise()
    : undefined;
  if (
    paramStartDate &&
    paramStartDate.Parameter &&
    paramStartDate.Parameter.Value &&
    paramStartDate.Parameter.Value !== 'Undefined'
  ) {
    startTime = paramStartDate.Parameter.Value;
  } else {
    switch (process.env.METRICSEXPORTPRIOD) {
      case 'MONTHLY': {
        startTime = moment()
          .subtract(1, 'months')
          .format('LLLL');
        break;
      }
      case 'FORTNIGHLY': {
        startTime = moment()
          .subtract(14, 'days')
          .format('LLLL');
        break;
      }
      default: {
        startTime = moment()
          .subtract(7, 'days')
          .format('LLLL');
        break;
      }
    }
  }
  return new Date(startTime);
}

export async function getMetricsData(
  cloudwatch: CloudWatch,
  startTime: Date,
  endTime: Date,
  period: number,
  metrics: any,
): Promise<CloudWatch.GetMetricDataOutput> {
  const param: CloudWatch.GetMetricDataInput = {
    StartTime: startTime,
    EndTime: endTime,
    MetricDataQueries: constructGetMetricsQuery(period, metrics),
  };
  const result = await cloudwatch.getMetricData(param).promise();
  console.log('Get metric result is: ', JSON.stringify(result));
  return result;
}

export function constructGetMetricsQuery(period, metrics): CloudWatch.MetricDataQueries {
  const metricQuery: CloudWatch.MetricDataQueries = [];
  metrics.forEach((metric, i) => {
    metricQuery.push({
      Id: `m${i}`,
      MetricStat: {
        Metric: {
          MetricName: metric.metricName,
          Namespace: metric.nameSpace,
        },
        Period: period,
        Stat: 'Average',
      },
    });
  });
  console.log('constructed query is: ', metricQuery);
  return metricQuery;
}

export async function storeResultInS3(
  s3: S3,
  metricsData: CloudWatch.GetMetricDataOutput,
  event: ScheduledEvent,
): Promise<void> {
  if (process.env.EXPORTBUCKETNAME) {
    const params: S3.PutObjectRequest = {
      Bucket: process.env.EXPORTBUCKETNAME,
      Key: `CloudWatchMetrics/acc=${event.account}/reg=${
        config.region
      }/y=${new Date().getFullYear()}/${new Date().getTime()}.json`,
      Body: JSON.stringify(metricsData),
    };
    const result = await s3.putObject(params).promise();
    console.log('S3 put object result is: ', JSON.stringify(result));
  } else {
    console.log('Could not find the bucketName');
  }
}

export async function storeEndTime(ssm: SSM, endTime: string): Promise<void> {
  if (process.env.SSMPARAMETERNAME) {
    const param: SSM.PutParameterRequest = {
      Name: process.env.SSMPARAMETERNAME,
      Value: endTime,
      Type: 'String',
      Overwrite: true,
    };
    await ssm.putParameter(param).promise();
  }
}
