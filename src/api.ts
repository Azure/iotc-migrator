import axios from 'axios';

export function getGroups(authContext: any) {
    return new Promise(async (resolve, reject) => {
        const token = await authContext.getAccessToken();
        axios(`https://${authContext.applicationHost}/api/preview/deviceGroups`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then((res: any) => { resolve(res.data.value); })
            .catch((err) => { reject(err); });
    })
}

export function getTemplates(authContext: any) {
    return new Promise(async (resolve, reject) => {
        const token = await authContext.getAccessToken();
        const groups: any = [];
        axios(`https://${authContext.applicationHost}/api/preview/deviceTemplates`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then((res: any) => { resolve(res.data.value); })
            .catch((err) => { reject(err); });
    })
}