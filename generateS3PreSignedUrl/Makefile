zipfile=lambda.zip

all: zip deploy

zip:
	zip -r $(zipfile) package/ lambda_function.py

deploy:
	aws lambda update-function-code --function-name publicFileUploader \
	--zip-file fileb://$(zipfile)
