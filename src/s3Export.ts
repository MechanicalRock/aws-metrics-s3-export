/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-var-requires */
import { ScheduledEvent } from 'aws-lambda';
import { SSM, config, CloudWatch, S3 } from 'aws-sdk';
const moment = require('moment');

config.update({ region: 'ap-southeast-2' });

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Event is: ', event);
  const ssm = new SSM();
  const s3 = new S3();
  if (process.env.METRICSFILTER) {
    console.log('process.env.METRICSFILTER: ', process.env.METRICSFILTER);
    const metrics = JSON.parse(process.env.METRICSFILTER);
    const startTime = await retrieveStartTime(ssm);
    const endTime = new Date();
    const cw = new CloudWatch();
    const period = 3600;

    for (let i = 0; i < metrics.length; i++) {
      const metricData = await getMetricsData(
        cw,
        metrics[i].metricName,
        metrics[i].nameSpace,
        startTime,
        endTime,
        period,
      );
      await storeResultInS3(s3, metrics[i].metricName, metrics[i].nameSpace, JSON.stringify(metricData), event);
      console.log('Start Time is:', startTime);
    }

    await storeEndTime(ssm, endTime.toString());
    console.log('End Time is:', endTime);
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
  metricName: string,
  nameSpace: string,
  startTime: Date,
  endTime: Date,
  period: number,
): Promise<CloudWatch.GetMetricStatisticsOutput> {
  const x: CloudWatch.GetMetricStatisticsInput = {
    MetricName: metricName,
    Namespace: nameSpace,
    Period: period,
    StartTime: new Date(startTime),
    EndTime: endTime,
    Statistics: ['Average'],
  };
  const result = await cloudwatch.getMetricStatistics(x).promise();
  console.log('Get metric result is: ', JSON.stringify(result));
  return result;
}

export async function storeResultInS3(
  s3: S3,
  metricName: string,
  nameSpace: string,
  metricsData: any,
  event: ScheduledEvent,
): Promise<void> {
  if (process.env.EXPORTBUCKETNAME) {
    const params: S3.PutObjectRequest = {
      Bucket: process.env.EXPORTBUCKETNAME,
      Key: `CloudWatchMetrics/acc=${event.account}/reg=${
        config.region
      }/${nameSpace}-${metricName}/y=${new Date().getFullYear()}/${new Date().getTime()}.json`,
      Body: metricsData,
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
