# Iotc-migrator

A Companion Experience that enables you to move devices between Azure IoT Central applications or move devices from an Azure IoT Central application to an Azure IoT Hub.

## Requirement

1. An IoT Central Application

    > Go to [IoT Central](https://apps.azureiotcentral.com/home) to create one.

2. Azure Active Directory Application (AAD).  

    > Go to [Azure Portal > AAD > App registration](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps) to create a new AAD Application and follow the [instruction below](#Create-an-AAD-Application).

3. An Azure IoT Hub instance

    > Go to [Azure Portal > IoT Hub](https://portal.azure.com/#create/Microsoft.IotHub) to create one IoT Hub.

4. An Azure IoT Hub Device Provisioning Services (DPS) associated to the IoT Hub instance

    > Go to [Azure Portal > DPS](https://portal.azure.com/#create/Microsoft.IoTDeviceProvisioning) to create one DPS.

## Setup

Update the [config.ts](./src/config.ts) using the information from your AAD application.

```typescript
{
    AADLoginServer: 'https://login.microsoftonline.com',
    AADClientID: '<your-AAD-Application-(client)-ID>',
    AADDirectoryID: '<your-AAD-Directory-(tenant)-ID>',
    AADRedirectURI: 'http://localhost:3000',
    applicationHost: '<your-iot-central-app>.azureiotcentral.com'
}
```

> Make sure that the `AADRedirectURI` in the config file and the `Redirect URIs` specified in your AAD Application are the same.

## First run

You can run the SPA in the development mode using:

 `npm start`

Open in the browser the `AADRedirectURI url` previously defined in your `config.ts` (by default is [http://localhost:3000](http://localhost:3000)) to view it in the browser.

Once the Application is loaded, follow the guidelines in the UI to perform a migration from the IoT Central application to Azure IoT Hub.

 > NOTE: To perform successfully the migration, make sure that the _device template_ associated to your devices has a Command capability named __DeviceMove__.

### Create and AAD Application

1. Go to [Azure Portal > Azure Active Directory > App Registration](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps)

2. Click on _New Registration_
![New registration](/assets/registerApp.png)

3. Fill the form using making sure to put in the `Redirect URI` the same value defined in the `config.ts` under _AADRedirectURI_
![Create app](/assets/newApp.png)

4. Click _Register_ and once the app is created you will get the paramaters needed in the `config.ts`
![App created](/assets/appCreated.png)

### Codebase

Iotc-migrator is a React SPA application written in Typescript that runs 100% in the browser. It was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

The project consume the [IoT Central Rest APIs](https://docs.microsoft.com/rest/api/iotcentral/) with the following version: _1.1-preview_.

The Authentication is performed using [Microsoft Authentication Library (MSAL)](https://www.npmjs.com/package/msal).

### Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
