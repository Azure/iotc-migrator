# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
import os
import asyncio
from random import randint
from dotenv import load_dotenv
import json

from azure.iot.device.aio import IoTHubDeviceClient
from azure.iot.device.aio import ProvisioningDeviceClient
from azure.iot.device import Message, MethodResponse

PROVISIONING_HOST = "global.azure-devices-provisioning.net"

global id_scope
global registration_id
global symmetric_key
global device_client


async def devicemove_handler(device_client: IoTHubDeviceClient, values):
    global id_scope
    print('Received "DeviceMove".')
    id_scope = values["idScope"]
    await device_client.disconnect()
    device_client = await connect_device()
    print("Migrated")


def create_devicemove_response(values):
    response = {"result": True, "data": "Migration received. Disconnecting..."}
    return response


async def send_telemetry_from_temperature(device_client, telemetry_msg):
    msg = Message(json.dumps(telemetry_msg))
    msg.content_encoding = "utf-8"
    msg.content_type = "application/json"
    print("Sent message")
    await device_client.send_message(msg)


async def execute_command_listener(
    device_client: IoTHubDeviceClient,
    component_name,
    method_name,
    user_command_handler,
    create_user_response_handler,
):
    while True:
        if method_name:
            command_name = (
                f"{component_name}*{method_name}" if component_name else method_name
            )
        else:
            command_name = None

        command_request = await device_client.receive_method_request(command_name)
        print("Command request received with payload")
        print(command_request.payload)

        values = {}
        if not command_request.payload:
            print("Payload was empty.")
        else:
            values = command_request.payload

        response_status = 200
        response_payload = create_user_response_handler(values)

        command_response = MethodResponse.create_from_method_request(
            command_request, response_status, response_payload
        )

        try:
            await device_client.send_method_response(command_response)
        except Exception:
            print(
                "responding to the {command} command failed".format(command=method_name)
            )

        await user_command_handler(device_client, values)


def stdin_listener():
    """
    Listener for quitting the sample
    """
    while True:
        selection = input("Press Q to quit\n")
        if selection == "Q" or selection == "q":
            print("Quitting...")
            break


# END KEYBOARD INPUT LISTENER
#####################################################


async def connect_device():
    global registration_id, id_scope, symmetric_key

    provisioning_device_client = ProvisioningDeviceClient.create_from_symmetric_key(
        provisioning_host=PROVISIONING_HOST,
        registration_id=registration_id,
        id_scope=id_scope,
        symmetric_key=symmetric_key,
    )
    registration_result = await provisioning_device_client.register()

    if registration_result.status == "assigned":
        print(f"Device was assigned to id Scope {id_scope}")
        print(registration_result.registration_state.assigned_hub)
        print(registration_result.registration_state.device_id)

        device_client = IoTHubDeviceClient.create_from_symmetric_key(
            symmetric_key=symmetric_key,
            hostname=registration_result.registration_state.assigned_hub,
            device_id=registration_result.registration_state.device_id,
        )
    else:
        raise RuntimeError(
            "Could not provision device. Aborting Plug and Play device connection."
        )

    # Connect the client.
    await device_client.connect()
    return device_client


#####################################################
# MAIN STARTS
async def main():
    global id_scope, registration_id, symmetric_key, device_client

    id_scope = os.getenv("DPS_ID_SCOPE")
    registration_id = os.getenv("DPS_DEVICE_ID")
    symmetric_key = os.getenv("DPS_DEVICE_KEY")

    device_client = await connect_device()

    listeners = asyncio.gather(
        execute_command_listener(
            device_client,
            component_name="migration",
            method_name="DeviceMove",
            user_command_handler=devicemove_handler,
            create_user_response_handler=create_devicemove_response,
        )
    )

    ################################################
    # Send telemetry (current temperature)

    async def send_telemetry():
        print("Sending sample temperature telemetry")
        while device_client.connected:
            temperature_msg1 = {"temperature": randint(20, 90)}
            await send_telemetry_from_temperature(device_client, temperature_msg1)
            await asyncio.sleep(8)

    send_telemetry_task = asyncio.create_task(send_telemetry())

    # Run the stdin listener in the event loop
    loop = asyncio.get_running_loop()
    user_finished = loop.run_in_executor(None, stdin_listener)
    # # Wait for user to indicate they are done listening for method calls
    await user_finished

    if not listeners.done():
        listeners.set_result("DONE")

    listeners.cancel()

    send_telemetry_task.cancel()

    # Finally, shut down the client
    await device_client.shutdown()


if __name__ == "__main__":
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))
    asyncio.run(main())
