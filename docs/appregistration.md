1. Go to [Azure Portal > Azure Active Directory > App Registration](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps)

2. Click on _New Registration_
![New registration](/assets/registerApp.png)

3. Fill the form using making sure to put in the `Redirect URI` the same value defined in the `.env` file under _REACT_APP_AAD_APP_REDIRECT_URI_
![Create app](/assets/newApp.png)

4. Click _Register_ and once the app is created you will get the paramaters needed in the `.env` file.
![App created](/assets/appCreated.png)

5. Go to _Manifest_ view and add the required permissions in the _requiredResourceAccess_ list.

![Manifest](/assets/manifest.png)

```json
[
		{
			"resourceAppId": "9edfcdd9-0bc5-4bd4-b287-c3afc716aac7",
			"resourceAccess": [
				{
					"id": "73792908-5709-46da-9a68-098589599db6",
					"type": "Scope"
				}
			]
		},
		{
			"resourceAppId": "797f4846-ba00-4fd7-ba43-dac1f8f63013",
			"resourceAccess": [
				{
					"id": "41094075-9dad-400e-a0bd-54e686782033",
					"type": "Scope"
				}
			]
		},
		{
			"resourceAppId": "00000003-0000-0000-c000-000000000000",
			"resourceAccess": [
				{
					"id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
					"type": "Scope"
				}
			]
		}
	]
```