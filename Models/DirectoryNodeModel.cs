using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using MessagePack;
using Newtonsoft.Json;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class DirectoryNodeModel
    {
        [JsonIgnore]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        
        [JsonIgnore]
        public int? ParentId { get; set; }

        [JsonIgnore]
        public DirectoryNodeModel Parent { get; set; }

        [JsonIgnore]
        public bool Locked { get; set; }

        [Key("name")]
        public string Name { get; set; }

        [Key("files")]
        public List<FileNodeModel> Files { get; set; }

        [Key("directories")]
        public List<DirectoryNodeModel> Directories { get; set; }
    }
}