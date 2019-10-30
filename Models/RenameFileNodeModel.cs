using System.ComponentModel.DataAnnotations.Schema;
using MessagePack;
using Newtonsoft.Json;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class RenameFileNodeModel
    {
        public string OriginalFileName;
        public string NewFileName;
    }
}