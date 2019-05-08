namespace CryptoBotUI.Hubs.Types
{
    public class SuccessResponse : HubResponse
    {
        public SuccessResponse()
        {
            Success = true;
        }
    }

    public class SuccessResponse<T> : HubResponse<T>
    {
        public SuccessResponse(T data)
        {
            Success = true;
            Data = data;
        }
    }
}