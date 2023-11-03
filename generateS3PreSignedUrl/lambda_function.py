import boto3
import json
import base64
import os

from time import time
from botocore.exceptions import ClientError


def make_response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "https://alazarte.com",
            "Access-Control-Allow-Methods": "POST",
        },
        "body": json.dumps(payload),
    }


def lambda_handler(event, context):
    target_bucket = "alazarte.com"
    presigned_expiration = 60
    presigned_response = None

    body = None
    filename = None
    mime = None

    # TODO I have to create this to first check if the IP already made a call,
    # and write a new IP
    ddb_client = boto3.client('dynamodb', region_name=os.environ["REGION"])
    timestamp = int(time())

    print("Received event:", json.dumps(event))

    try:
        key = {'IP': {'S': event["headers"]["X-Forwarded-For"]}}
        res = ddb_client.get_item(TableName='s3UploadFilesIPs', Key=key)
        seconds_after_created = 60
        if "Item" in res and int(res["Item"]["TTL"]["N"]) + seconds_after_created > timestamp:
            return make_response(429, "Wait before uploading a new file")
    except Exception as e:
        print(f"Failed to record the IP: {e}")
        return make_response(500, "Failed to read if IP uploaded a file")

    try:
        body = bytes(event["body"], "ascii")
        if event["isBase64Encoded"]:
            body = base64.b64decode(body)
        print(f"Decoded body={body}")
    except Exception as e:
        print(f"Failed to decode body, exception={e}")
        return make_response(500, "Failed decoding request")

    try:
        filename = body.split(b";")[1].split(b"\r\n")[2].decode()
        mime = body.split(b";")[2].split(b"\r\n")[2].decode()
    except Exception as e:
        print(f"Failed to parse body, exception={e}")
        return make_response(500, "Failed decoding request")

    if filename is None or mime is None:
        print("Filename or mime is none")
        return make_response(500, "Failed to get filename")

    # Generate a presigned URL for the S3 object
    s3_client = boto3.client("s3")
    try:
        params = {
            "Bucket": target_bucket,
            "Key": f"upload/uploaded/{filename}",
            "ContentType": mime,
        }

        presigned_response = s3_client.generate_presigned_url("put_object",
                                                              Params=params,
                                                              ExpiresIn=presigned_expiration)
    except ClientError as e:
        print(f"ClientError={e}")
        return make_response(500, "Failed to get presigned url")

    print("Presigned URL:", presigned_response)

    try:
        item = {
            'IP': {'S': event["headers"]["X-Forwarded-For"]}, "TTL": {"N": str(timestamp)}}
        ddb_client.put_item(TableName='s3UploadFilesIPs', Item=item)
    except Exception as e:
        print(f"Failed to store IP: {e}")
        return make_response(500, "Failed to set IP in DynamoDB")

    return make_response(200, presigned_response)
