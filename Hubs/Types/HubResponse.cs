using System;
using MessagePack;

namespace CryptoBotUI.Hubs.Types
{
    [MessagePackObject]
    public abstract class HubResponse
    {
        [Key("success")]
        public bool Success;

        [Key("error")]
        public Exception Error;
    }

    public abstract class HubResponse<T> : HubResponse
    {
        [Key("data")]
        public T Data;
    }
}