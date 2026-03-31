const dummyWrapper = async (handler, converter) => {
    return async (event, options) => {
        return await handler(event, options);
    };
};
export default {
    name: "dummy",
    wrapper: dummyWrapper,
    supportStreaming: true,
};
