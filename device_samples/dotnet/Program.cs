
using Microsoft.Azure.Devices.Provisioning.Client;
using Microsoft.Azure.Devices.Provisioning.Client.Transport;
using Microsoft.Azure.Devices.Shared;
using Microsoft.Extensions.Logging;
using DotNetEnv;
using System.Text;
using Newtonsoft.Json;
using System.Reflection;

namespace Microsoft.Azure.Devices.Client.Samples
{
    public class Program
    {

        internal enum StatusCode
        {
            Completed = 200,
            InProgress = 202,
            ReportDeviceInitialProperty = 203,
            BadRequest = 400,
            NotFound = 404
        }

        static readonly String DPS_ENDPOINT = "global.azure-devices-provisioning.net";
        static readonly String METHOD_NAME = "migration*DeviceMove";

        static string IdScope;
        static DeviceClient CurrentDeviceClient;
        static ILogger logger;
        static bool Connected;

        internal class ConsoleLogger : ILogger
        {
            public IDisposable BeginScope<TState>(TState state)
            {
                return null;
            }

            public bool IsEnabled(LogLevel logLevel)
            {
                return true;
            }

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception exception, Func<TState, Exception, string> formatter)
            {
                Console.WriteLine($"[{DateTime.Now}] {logLevel} {state.ToString()}");
            }
        }

        public static async Task Main(string[] args)
        {

            logger = new ConsoleLogger();
            string currentDir = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            Env.Load(Path.Combine(currentDir, "../../../../.env"));
            IdScope = System.Environment.GetEnvironmentVariable("DPS_ID_SCOPE")!;

            logger.LogInformation("Press Control+C to quit the sample.");
            using var cts = new CancellationTokenSource();

            Console.CancelKeyPress += (sender, eventArgs) =>
            {
                eventArgs.Cancel = true;
                cts.Cancel();
                logger.LogInformation("Sample execution cancellation requested; will exit.");
            };

            logger.LogDebug($"Set up the device client.");

            try
            {
                CurrentDeviceClient = await SetupDeviceClientAsync(cts.Token);
                Random randomGenerator = new Random();
                while (!cts.IsCancellationRequested)
                {
                    if (Connected)
                    {
                        await SendTelemetry(randomGenerator);
                        await Task.Delay(5 * 1000, cts.Token);
                    }
                }

                // PerformOperationsAsync is designed to run until cancellation has been explicitly requested, either through
                // cancellation token expiration or by Console.CancelKeyPress.
                // As a result, by the time the control reaches the call to close the device client, the cancellation token source would
                // have already had cancellation requested.
                // Hence, if you want to pass a cancellation token to any subsequent calls, a new token needs to be generated.
                // For device client APIs, you can also call them without a cancellation token, which will set a default
                // cancellation timeout of 4 minutes: https://github.com/Azure/azure-iot-sdk-csharp/blob/64f6e9f24371bc40ab3ec7a8b8accbfb537f0fe1/iothub/device/src/InternalClient.cs#L1922
                await CurrentDeviceClient.CloseAsync(CancellationToken.None);
            }
            catch (OperationCanceledException) { } // User canceled operation

        }

        private static async Task SendTelemetry(Random randomGenerator)
        {
            var temperature = randomGenerator.Next(20, 90);
            string messagePayload = $"{{\"temperature\":{temperature}}}";
            logger.LogDebug($"Sending: '{messagePayload}'");

            using var eventMessage = new Message(Encoding.UTF8.GetBytes(messagePayload))
            {
                ContentEncoding = Encoding.UTF8.ToString(),
                ContentType = "application/json",
            };

            await CurrentDeviceClient.SendEventAsync(eventMessage);
        }


        private static async Task<DeviceClient> SetupDeviceClientAsync(CancellationToken cancellationToken)
        {
            string deviceKey = System.Environment.GetEnvironmentVariable("DPS_DEVICE_KEY")!;
            logger.LogInformation($"DeviceKey: {deviceKey}, ScopeId: {IdScope}");
            DeviceRegistrationResult dpsRegistrationResult = await ProvisionDeviceAsync(cancellationToken, deviceKey);
            logger.LogInformation($"Registration: {dpsRegistrationResult.AssignedHub}");
            var authMethod = new DeviceAuthenticationWithRegistrySymmetricKey(dpsRegistrationResult.DeviceId, deviceKey);
            CurrentDeviceClient = InitializeDeviceClient(dpsRegistrationResult.AssignedHub, authMethod, cancellationToken);
            return CurrentDeviceClient;
        }

        // Provision a device via DPS, by sending the PnP model Id as DPS payload.
        private static async Task<DeviceRegistrationResult> ProvisionDeviceAsync(CancellationToken cancellationToken, string deviceKey)
        {
            using SecurityProvider symmetricKeyProvider = new SecurityProviderSymmetricKey(System.Environment.GetEnvironmentVariable("DPS_DEVICE_ID"), deviceKey, null);
            using ProvisioningTransportHandler mqttTransportHandler = new ProvisioningTransportHandlerMqtt();
            ProvisioningDeviceClient pdc = ProvisioningDeviceClient.Create(DPS_ENDPOINT, IdScope, symmetricKeyProvider, mqttTransportHandler);

            return await pdc.RegisterAsync(cancellationToken);
        }

        private static async Task UpdateClient(CancellationToken token, string newIdScope)
        {
            await Task.Delay(3000);
            await CurrentDeviceClient.CloseAsync();
            Connected = false;
            IdScope = newIdScope;
            CurrentDeviceClient = await SetupDeviceClientAsync(token);
        }
        private static async Task<MethodResponse> HandleDeviceMove(MethodRequest request, object userContext)
        {
            try
            {
                var payload = new { idScope = "" };
                CancellationToken token = (CancellationToken)userContext;
                string newIdScope = (JsonConvert.DeserializeAnonymousType(request.DataAsJson, payload)!).idScope;
                logger.LogInformation($"Received device move command to {newIdScope}");
                UpdateClient(token, newIdScope);
            }
            catch (JsonReaderException ex)
            {
                // _logger.LogDebug($"Command input is invalid: {ex.Message}.");
                return new MethodResponse((int)StatusCode.BadRequest);
            }

            return new MethodResponse((int)StatusCode.Completed);
        }


        // Initialize the device client instance using symmetric key based authentication, over Mqtt protocol (TCP, with fallback over Websocket) and setting the ModelId into ClientOptions.
        private static DeviceClient InitializeDeviceClient(string hostname, IAuthenticationMethod authenticationMethod, CancellationToken ct)
        {
            var options = new ClientOptions();
            DeviceClient deviceClient = DeviceClient.Create(hostname, authenticationMethod, TransportType.Mqtt, options);
            deviceClient.SetMethodHandlerAsync(METHOD_NAME, HandleDeviceMove, ct);
            Connected = true;
            return deviceClient;
        }
    }
}