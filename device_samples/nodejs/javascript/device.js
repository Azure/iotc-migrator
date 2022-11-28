'use strict'
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
const Protocol = require('azure-iot-device-mqtt').Mqtt
const ProvProtocol = require('azure-iot-provisioning-device-mqtt').Mqtt

const Client = require('azure-iot-device').Client
const Message = require('azure-iot-device').Message
const SymmetricKeySecurityClient =
    require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient
const ProvisioningDeviceClient =
    require('azure-iot-provisioning-device').ProvisioningDeviceClient

// DPS connection information
const PROVISIONING_HOST = 'global.azure-devices-provisioning.net'
const METHOD_NAME = 'migration*DeviceMove'
let idScope = process.env.DPS_ID_SCOPE
const registrationId = process.env.DPS_DEVICE_ID
const symmetricKey = process.env.DPS_DEVICE_KEY

let deviceClient
let connected = false
let intervalToken

const commandHandler = async (request, response) => {
    switch (request.methodName) {
        case METHOD_NAME: {
            console.log('New idscope ' + request.payload.idScope)
            await sendCommandResponse(
                request,
                response,
                200,
                request.payload.idScope
            )
            connected = false
            deviceClient.close()
            idScope = request.payload.idScope
            deviceClient = await connectDevice()
            break
        }
        default:
            await sendCommandResponse(request, response, 404, 'unknown method')
            break
    }
}

const sendCommandResponse = async (request, response, status, payload) => {
    try {
        await response.send(status, payload)
        console.log(
            "Response to method '" + request.methodName + "' sent successfully."
        )
    } catch (err) {
        console.error(
            'An error ocurred when sending a method response:\n' +
                err.toString()
        )
    }
}

const attachExitHandler = async (deviceClient) => {
    const standardInput = process.stdin
    standardInput.setEncoding('utf-8')
    console.log('Please enter q or Q to exit sample.')
    standardInput.on('data', (data) => {
        if (data === 'q\n' || data === 'Q\n') {
            console.log('Clearing intervals and exiting sample.')
            clearInterval(intervalToken)
            deviceClient.close()
            process.exit()
        } else {
            console.log('User Input was : ' + data)
            console.log('Please only enter q or Q to exit sample.')
        }
    })
}

async function sendTelemetry(deviceClient, index) {
    const temperature = Math.random() * 60 + 30
    console.log(`Sending temperature ${temperature}.\n`)
    const msg = new Message(
        JSON.stringify({
            temperature,
        })
    )
    msg.contentType = 'application/json'
    msg.contentEncoding = 'utf-8'
    await deviceClient.sendEvent(msg)
}

async function connectDevice() {
    let provSecurityClient = new SymmetricKeySecurityClient(
        registrationId,
        symmetricKey
    )
    let provisioningClient = ProvisioningDeviceClient.create(
        PROVISIONING_HOST,
        idScope,
        new ProvProtocol(),
        provSecurityClient
    )

    try {
        let result = await provisioningClient.register()
        const deviceConnectionString =
            'HostName=' +
            result.assignedHub +
            ';DeviceId=' +
            result.deviceId +
            ';SharedAccessKey=' +
            symmetricKey
        console.log(`Connecting with: ${deviceConnectionString}\n`)
        const client = Client.fromConnectionString(
            deviceConnectionString,
            Protocol
        )
        client.onDeviceMethod(METHOD_NAME, commandHandler)
        await client.open()
        connected = true
        return client
    } catch (err) {
        console.error('error registering device: ' + err.toString())
    }
}

async function main() {
    try {
        deviceClient = await connectDevice()

        // Send Telemetry every 10 secs
        intervalToken = setInterval(async () => {
            if (connected) {
                await sendTelemetry(deviceClient)
            }
        }, 10000)

        // attach a standard input exit listener
        attachExitHandler(deviceClient)
    } catch (err) {
        console.error('could not connect client.\n' + err.toString())
    }
}

main()
    .then(() => console.log('executed sample'))
    .catch((err) => console.log('error', err))
