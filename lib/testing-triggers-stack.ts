import {
  aws_apigateway,
  aws_dynamodb,
  aws_lambda,
  Stack,
  StackProps,
  aws_lambda_event_sources,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";

export class TestingTriggersStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // TABLA DE DYNAMO 💾
    const greetingsTable = new aws_dynamodb.Table(this, "GreetingsTable", {
      partitionKey: { name: "id", type: aws_dynamodb.AttributeType.STRING },
      // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.StreamViewType.html
      // que tipo de datos quieres que se guarden en la stream tabla despues de ser modificada
      // en el link de arriba aparecen los tipos que hay 👆
      // NEW_IMAGE
      // OLD_IMAGE
      // NEW_AND_OLD_IMAGES
      // KEYS_ONLY
      stream: aws_dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // LAMBDA PARA GUARDAR DATOS, SE ACTIVA CON EN EL METODO POST ➡️ 📖✍️
    const saveHelloFunction = new aws_lambda.Function(
      this,
      "SaveHelloFunction",
      {
        runtime: aws_lambda.Runtime.NODEJS_14_X,
        handler: "handler.saveHello",
        code: aws_lambda.Code.fromAsset(path.resolve(__dirname, "lambda")),
        environment: {
          GREETINGS_TABLE: greetingsTable.tableName,
        },
      }
    );

    // LAMBDA QUE CREA UN NUEVO REGISGTRO Y SE ACTIVA CUANDO UN REGISTRO FUE CREADO, EL TRIGGER ➡️ ✍️
    const updateAfterEvent = new aws_lambda.Function(this, "UpdateAfterEvent", {
      runtime: aws_lambda.Runtime.NODEJS_14_X,
      handler: "handler.reactToEvent",
      code: aws_lambda.Code.fromAsset(path.resolve(__dirname, "lambda")),
      environment: {
        GREETINGS_TABLE: greetingsTable.tableName,
      },
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources-readme.html#dynamodb-streams
    // DEFININENDO COMO FUNCIONARA EL EVENTO QUE ACTIVARA LA LAMBDA ➡️ ✍️
    // En el link de arriba muestra como se define el evento que activara la funcion lambda,
    // en este caso la funcion: updateAfterEvent
    updateAfterEvent.addEventSource(
      new aws_lambda_event_sources.DynamoEventSource(greetingsTable, {
        startingPosition: aws_lambda.StartingPosition.LATEST,
        batchSize: 1,
        bisectBatchOnError: false,
        retryAttempts: 10,
        enabled: true,
      })
    );

    // ESTA LAMBDA SÓLO RETORNA UN REGISTRO DE LA TALBA DE DYNAMO, NO TIENE NADA QUE VER CONR LE TRIGGER ➡️ 📖
    const getHelloFunction = new aws_lambda.Function(this, "GetHelloFunction", {
      runtime: aws_lambda.Runtime.NODEJS_14_X,
      handler: "handler.getHello",
      code: aws_lambda.Code.fromAsset(path.resolve(__dirname, "lambda")),
      environment: {
        GREETINGS_TABLE: greetingsTable.tableName,
      },
    });

    // PERMISOS DE LECTURA Y ESCRITURA  A LA PRIMERA LAMBDA QUE CREAR Y RETORNA EL MISMO OBJETO ➡️ 📖✍️
    greetingsTable.grantReadWriteData(saveHelloFunction);
    // PERMISISOS DE LECTURA A LA SEGUNDA LAMBADA, QUE SÓLO RECUPERA UN OBJETO POR SU ID ➡️ 📖
    greetingsTable.grantReadData(getHelloFunction);
    // PERMISOS DE ESCRITURA PARA LA LAMBDA QUE SE ACTIVA CUANDO UN REGISTRO ES CREADO ➡️ ✍️
    greetingsTable.grantWriteData(updateAfterEvent);

    const helloAPI = new aws_apigateway.RestApi(this, "helloApi");

    // ruta para la ejecturar la lambda que hara trigger a otra lambda ➡️ 📖✍️
    helloAPI.root
      .resourceForPath("hello")
      .addMethod(
        "POST",
        new aws_apigateway.LambdaIntegration(saveHelloFunction)
      );

    // ruta para ejectuar la lambda que sólo retorna un objecto de la tabla ➡️ 📖
    helloAPI.root
      .resourceForPath("hello")
      .addMethod("GET", new aws_apigateway.LambdaIntegration(getHelloFunction));
  }
}
