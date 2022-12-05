# Device Migration samples

This folder contains few code samples for devices receiving a new _IdScope_ through the direct method configured in the _Migration_ DTDL component.
Each sample has the same functionalities (sends a simple telemetry in a loop and responds to the "_DeviceMove_" method) coded with a different language.

## Run
1. Create a _".env"_ file in this folder (it must be at the root of samples) with the following content:

```ini
DPS_ID_SCOPE=<ID_SCOPE>
DPS_DEVICE_ID=<DEVICE_ID>
DPS_DEVICE_KEY=<DEVICE_KEY>
```

2. Run the required sample based on the language:

- NodeJS

Javascript
```sh
cd nodejs
npm install
node javascript/device.js
```

Typescript
```sh
cd nodejs
npm install
npm run build
node dist/device.js
```

- Python
```sh
cd python
pip install -r requirements.txt
python device.py
```

- Dotnet
```sh
cd dotnet
dotnet restore
dotnet build
dotnet run
```