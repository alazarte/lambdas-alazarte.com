import boto3
import os


def lambda_handler(event, context):
    bucket_name = 'alazarte.com'
    html_file = ""

    client = boto3.client("s3", region_name=os.environ["REGION"])
    objects = client.list_objects(
        Bucket=bucket_name, Prefix="upload/uploaded/")

    if "Contents" in objects:
        for f in [f["Key"] for f in objects["Contents"] if f["Size"] > 0]:
            name = f.split("/")[-1]
            html_file += f"<a href='https://{bucket_name}/{f}'>{name}</a><br>"

    client.put_object(Body=html_file, Bucket=bucket_name,
                      Key="upload/list.html", ContentType="text/html")
