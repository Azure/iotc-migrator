import * as React from 'react';

const usePromise = () => {
    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<any>(null);
    const [error, setError] = React.useState<any>(null);

    const callPromise = async ({ promiseFn }: { promiseFn: any }) => {
        setLoading(true);
        setData(null);
        setError(null);
        try {
            const res = await promiseFn();
            setData(res);
        } catch (error) {
            setError(error);
        }
        setLoading(false);
    };

    return [loading, data, error, callPromise];
};

export default usePromise