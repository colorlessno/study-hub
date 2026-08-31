exports.handler = async (event, context = {}) => {
  const name = event.queryStringParameters?.name;
  const requestId = context.awsRequestId || "local-request";
  const greetingPrefix = process.env.GREETING_PREFIX || "hello";

  if (typeof name !== "string" || name.trim() === "") {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: "name_required",
        requestId,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `${greetingPrefix} ${name.trim()}`,
      requestId,
      hasBody: Boolean(event.body),
      runtime: {
        functionName: context.functionName || "HelloFunction",
        memoryLimitInMB: context.memoryLimitInMB || "128",
        remainingTimeInMillis: typeof context.getRemainingTimeInMillis === "function"
          ? context.getRemainingTimeInMillis()
          : 5000,
        greetingPrefix,
      },
    }),
  };
};
