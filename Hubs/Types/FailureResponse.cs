using System;

namespace CryptoBotUI.Hubs.Types
{
    public class FailureResponse : HubResponse
    {
        public FailureResponse(string error)
        {
            Success = false;
            Error = new Exception(error);
        }

        public FailureResponse(Exception ex)
        {
            Success = false;
            Error = ex;
        }
    }

    public class FailureResponse<T> : HubResponse<T>
    {
        public FailureResponse(string error)
        {
            Success = false;
            Error = new Exception(error);
        }

        public FailureResponse(Exception ex)
        {
            Success = false;
            Error = ex;
        }
    }
}