using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CryptoBot.Scripting;
using CryptoBot.Scripting.Modules;
using CryptoBotUI.Hubs;
using CryptoBotUI.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CryptoBotUI.Services
{
    public class StrategyService
    {
        private IHubContext<MainHub>   _hubContext;
        private StrategyContext        _strategyContext;
        private ExchangeNetworkService _exchangeNetworkService;
        private SemaphoreSlim          _dbSemaphore;

        public StrategyService
        (
            IHubContext<MainHub> hubContext,
            StrategyContext strategyContext,
            ExchangeNetworkService exchangeNetworkService
        )
        {
            _hubContext             = hubContext;
            _strategyContext        = strategyContext;
            _exchangeNetworkService = exchangeNetworkService;
            _dbSemaphore            = new SemaphoreSlim(1, 1);

            ScriptManager.Initialize(_exchangeNetworkService.Network, _exchangeNetworkService.Indicators);
        }

        public async Task<List<DirectoryNodeModel>> GetFileSystemStructure()
        {
            await _dbSemaphore.WaitAsync();

            var rootDirs = _strategyContext.DirectoryNodes
                .Where(d => d.Parent == null);
            
            void Populate(DirectoryNodeModel dir)
            {
                _strategyContext.Entry(dir)
                    .Collection(d => d.Directories)
                    .Load();

                _strategyContext.Entry(dir)
                    .Collection(d => d.Files)
                    .Load();

                foreach (var file in dir.Files)
                {
                    _strategyContext.Entry(file)
                        .Collection(f => f.Problems)
                        .Load();

                    file.Content = null;
                }

                foreach (var childDir in dir.Directories)
                    Populate(childDir);
            }

            foreach (var rootDir in rootDirs)
                Populate(rootDir);
            
            _dbSemaphore.Release();

            return rootDirs.ToList();
        }

        public async Task CreateFile(CreateFileModel model)
        {
            await _dbSemaphore.WaitAsync();

            var directory = await _strategyContext.DirectoryNodes
                .SingleOrDefaultAsync(d => d.Name == model.DirectoryName);

            if (directory == null)
                throw new Exception("A file with the same name already exists.");

            var newFile = new FileNodeModel()
            {
                Parent  = directory,
                Name    = model.NewFileName,
                Locked  = false,
                Content = ""
            };

            if (directory.Files == null)
                directory.Files = new List<FileNodeModel>();

            directory.Files.Add(newFile);
            await _strategyContext.SaveChangesAsync();

            _dbSemaphore.Release();
        }

        public async Task<FileNodeModel> GetFile(string fileName)
        {
            await _dbSemaphore.WaitAsync();
            
            var file = await FindFile(fileName);

            _dbSemaphore.Release();

            return file;
        }

        public async Task<FileNodeModel> TryGetFile(string fileName)
        {
            try { return await GetFile(fileName); }
            catch { return null; }
        }

        public async Task UpdateFile(UpdateFileModel model)
        {
            await _dbSemaphore.WaitAsync();

            var file = await FindFile(model.FileName);

            await _strategyContext.Entry(file)
                .Collection(f => f.Problems)
                .LoadAsync();

            if (file.Problems != null)
                _strategyContext.Problems.RemoveRange(file.Problems);

            file.Content = model.Content;
            file.Problems = model.Problems.ToList();

            _strategyContext.FileNodes.Update(file);
            await _strategyContext.SaveChangesAsync();

            _dbSemaphore.Release();
        }

        public async Task RenameFile(RenameFileNodeModel model)
        {
            await _dbSemaphore.WaitAsync();

            var file = await FindFile(model.OriginalFileName);
            file.Name = model.NewFileName;

            var referencingFiles = _strategyContext.FileNodes
                .Where(f => f.Name.EndsWith(".json") && f.Content.Contains($"\"{model.OriginalFileName}\""));

            foreach (var referencingFile in referencingFiles)
                referencingFile.Content = referencingFile.Content
                    .Replace($"\"{model.OriginalFileName}\"", $"\"{model.NewFileName}\"");

            _strategyContext.FileNodes.Update(file);
            _strategyContext.FileNodes.UpdateRange(referencingFiles);
            await _strategyContext.SaveChangesAsync();

            _dbSemaphore.Release();
        }

        public async void DeleteFile(string fileName)
        {
            await _dbSemaphore.WaitAsync();
            var file = await FindFile(fileName);
            _strategyContext.FileNodes.Remove(file);
            await _strategyContext.SaveChangesAsync();
            _dbSemaphore.Release();
        }

        public async void ExecuteScript(string fileName)
        {
            await _dbSemaphore.WaitAsync();

            var file = await FindFile(fileName);
            await _strategyContext
                .Entry(file)
                .Reference(f => f.Parent)
                .LoadAsync();

            _dbSemaphore.Release();

            var moduleType = GetModuleType(file);
            ScriptManager.Execute(moduleType, file.Content);
        }

        public ModuleType GetModuleType(FileNodeModel file)
        {
            switch (file.Parent.Name)
            {
                case "Pair Selectors":  return ModuleType.PairSelector;
                case "Signal Emitters": return ModuleType.SignalEmitter;
                case "Order Managers":  return ModuleType.OrderManager;
                default:                return ModuleType.Anonymous;
            }
        }

        private async Task<FileNodeModel> FindFile(string fileName)
        {
            var file = await _strategyContext.FileNodes
                .SingleOrDefaultAsync(f => f.Name == fileName);

            if (file == null)
                throw new Exception("No file with the specified name exists.");

            return file;
        }

        private async Task<Strategy> LoadStrategy(StrategyModel model)
        {
            var pairSelectorFile  = await GetFile(model.Modules.PairSelector.Name);
            var signalEmitterFile = await GetFile(model.Modules.SignalEmitter.Name);
            var orderManagerFile  = await GetFile(model.Modules.OrderManager.Name);

            var pairSelectorTsSource  = pairSelectorFile.Content;
            var signalEmitterTsSource = signalEmitterFile.Content;
            var orderManagerTsSource  = orderManagerFile.Content;

            var pairSelectorInputs  = new ScriptInputs(model.Modules.PairSelector.Inputs);
            var signalEmitterInputs = new ScriptInputs(model.Modules.SignalEmitter.Inputs);
            var orderManagerInputs  = new ScriptInputs(model.Modules.OrderManager.Inputs);

            var pairSelector  = new PairSelectorScript(pairSelectorTsSource, pairSelectorInputs);
            var signalEmitter = new SignalEmitterScript(signalEmitterTsSource, signalEmitterInputs);
            var orderManager  = new OrderManagerScript(orderManagerTsSource, pairSelectorInputs);

            var strategy = new Strategy(pairSelector, signalEmitter, orderManager);

            return strategy;
        }
    }
}