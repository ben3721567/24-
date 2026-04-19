'use client'

import { useState, useEffect } from 'react';
import { Activity, BarChart3, Settings2, ListTodo, Bot, Send } from 'lucide-react';

type Tab = 'logs' | 'signals' | 'stats' | 'config';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('signals');
  const [signals, setSignals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
      try {
          if (activeTab === 'signals') {
              const res = await fetch('/api/signals').then(r => r.json());
              setSignals(res);
          } else if (activeTab === 'logs') {
              const res = await fetch('/api/logs').then(r => r.json());
              setLogs(res);
          } else if (activeTab === 'stats') {
              const res = await fetch('/api/metrics').then(r => r.json());
              setMetrics(res);
          } else if (activeTab === 'config') {
              const res = await fetch('/api/configs').then(r => r.json());
              setConfig(res);
          }
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const saveConfig = async () => {
      setSaving(true);
      try {
          await fetch('/api/configs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config)
          });
          alert('保存成功！重启Worker生效。');
      } catch (e) {
          alert('保存失败。');
      }
      setSaving(false);
  }

  return (
      <div className="flex h-screen w-full bg-[#0b0e11] text-[#eaecef] overflow-hidden">
          {/* Sidebar */}
          <aside className="w-[220px] border-r border-[#2b2f36] bg-[#181a20] flex flex-col shrink-0">
              <div className="p-[30px_20px] text-[20px] font-extrabold text-[#f3ba2f] tracking-[1px] flex items-center">
                  AI <span className="text-[#eaecef] ml-2">SIGMA</span>
              </div>
              <nav className="flex-1 px-[10px]">
                  {[
                      { id: 'signals', label: '实时信号', icon: ListTodo },
                      { id: 'logs', label: '运行日志', icon: Activity },
                      { id: 'stats', label: '统计分析', icon: BarChart3 },
                      { id: 'config', label: '系统设置', icon: Settings2 },
                  ].map(t => (
                      <div
                          key={t.id}
                          onClick={() => setActiveTab(t.id as Tab)}
                          className={`flex items-center px-[15px] py-[12px] rounded-lg mb-[5px] cursor-pointer text-[14px] transition-all duration-200 ${
                              activeTab === t.id 
                                ? 'bg-[rgba(243,186,47,0.1)] text-[#f3ba2f] font-semibold' 
                                : 'text-[#848e9c] hover:bg-[#2b2f36]'
                          }`}
                      >
                          <t.icon className="w-4 h-4 mr-3 shrink-0" />
                          {t.label}
                      </div>
                  ))}
              </nav>
              <div className="p-[20px] border-t border-[#2b2f36] text-[11px] text-[#474d57]">
                  CryptoAI Monitoring v1.2.4<br/>Local Server: 127.0.0.1:5000
              </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-[25px] flex flex-col gap-[20px] overflow-auto relative">
              <header className="flex justify-between items-end pb-2">
                  <div>
                      <h1 className="text-[24px] mb-[4px] font-bold">系统监控概览</h1>
                      <p className="text-[13px] text-[#848e9c]">实时扫描 币安 24h 成交额前 20 永续合约</p>
                  </div>
                  <div className="flex gap-[20px]">
                      <div className="bg-[#181a20] border border-[#2b2f36] px-[12px] py-[5px] rounded text-[12px] flex items-center gap-[6px]">
                          <div className="w-[8px] h-[8px] rounded-full bg-[#02c076] shadow-[0_0_5px_#02c076]"></div> 监控运行中
                      </div>
                      <div className="bg-[#181a20] border border-[#2b2f36] px-[12px] py-[5px] rounded text-[12px] flex items-center gap-[6px]">
                          <div className="w-[8px] h-[8px] rounded-full bg-[#02c076] shadow-[0_0_5px_#02c076]"></div> DeepSeek V3
                      </div>
                      <div className="bg-[#181a20] border border-[#2b2f36] px-[12px] py-[5px] rounded text-[12px] flex items-center gap-[6px]">
                          <div className="w-[8px] h-[8px] rounded-full bg-[#02c076] shadow-[0_0_5px_#02c076]"></div> GPT-4o
                      </div>
                  </div>
              </header>

              {activeTab === 'signals' && (
                  <section className="bg-[#181a20] border border-[#2b2f36] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-100px)]">
                      <div className="p-[15px_20px] border-b border-[#2b2f36] flex justify-between items-center bg-[#181a20] z-10 sticky top-0">
                          <span className="text-[14px] font-semibold">最新推送信号 (实时监控)</span>
                      </div>
                      <div className="overflow-y-auto flex-1">
                          <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-[#181a20] z-0 shadow-sm border-b border-[#2b2f36]">
                                  <tr>
                                      <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">时间</th>
                                      <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">币种</th>
                                      <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">类型</th>
                                      <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">方向</th>
                                      <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">价格</th>
                                      <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">AI 评分</th>
                                      <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">结果</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {signals.map((s: any) => (
                                      <tr key={s.id} className="hover:bg-[#2b2f36]/30 group transition-colors">
                                          <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] font-mono text-[#848e9c]">{new Date(s.signal_time).toLocaleTimeString('zh-CN', {hour12:false})}</td>
                                          <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] font-bold text-[#eaecef]">{s.symbol}</td>
                                          <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] text-[#eaecef]">{s.signal_type}</td>
                                          <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36]">
                                            {s.direction === 'LONG' 
                                                ? <span className="px-[8px] py-[4px] rounded-[4px] text-[11px] font-bold text-[#02c076] bg-[rgba(2,192,118,0.15)]">LONG</span>
                                                : <span className="px-[8px] py-[4px] rounded-[4px] text-[11px] font-bold text-[#f84960] bg-[rgba(248,73,96,0.15)]">SHORT</span>
                                            }
                                          </td>
                                          <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] text-[#eaecef]">{s.entry ? parseFloat(s.entry).toFixed(4) : ''}</td>
                                          <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] font-bold text-[#f3ba2f]">{s.ai_score} <span className="text-[10px] text-[#848e9c] font-normal ml-1">({s.ai_provider})</span></td>
                                          <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36]">
                                            {!s.final_result || s.final_result === 'PENDING' ? <span className="text-[#848e9c]">跟踪中...</span> :
                                             s.final_result.includes('WIN') ? <span className="text-[#02c076] font-medium">{s.final_result}</span> :
                                             <span className="text-[#f84960] font-medium">{s.final_result}</span>
                                            }
                                          </td>
                                      </tr>
                                  ))}
                                  {signals.length === 0 && <tr><td colSpan={7} className="text-center py-[40px] text-[#848e9c]">暂无信号数据</td></tr>}
                              </tbody>
                          </table>
                      </div>
                  </section>
              )}

              {activeTab === 'logs' && (
                  <section className="bg-[#181a20] border border-[#2b2f36] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-100px)]">
                      <div className="p-[15px_20px] border-b border-[#2b2f36] flex justify-between items-center bg-[#181a20] z-10 sticky top-0">
                          <span className="text-[14px] font-semibold">系统实时日志</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-[20px] font-mono text-[11px] text-[#848e9c] leading-[1.6]">
                          {logs.map((l: any, i: number) => {
                              let levelCol = 'text-[#848e9c]';
                              if (l.level === 'INFO') levelCol = 'text-[#2ebd85]';
                              else if (l.level === 'WARN') levelCol = 'text-[#f3ba2f]';
                              else if (l.level === 'ERROR') levelCol = 'text-[#f84960]';
                              
                              return (
                                <div key={i} className="mb-[8px] pb-[4px] border-b border-dashed border-[#2b2f36]">
                                    <span className="text-[#474d57] mr-[8px]">[{new Date(l.timestamp).toLocaleTimeString('zh-CN', {hour12: false})}]</span>
                                    <span className={`${levelCol} mr-[8px]`}>{l.level}:</span>
                                    <span className="text-[#eaecef] break-words">{l.message}</span>
                                </div>
                              );
                          })}
                          {logs.length === 0 && <span className="text-[#848e9c]">暂无日志</span>}
                      </div>
                  </section>
              )}

              {activeTab === 'stats' && metrics && (
                  <div className="flex flex-col gap-[20px]">
                      <div className="flex gap-[15px] overflow-x-auto pb-2">
                          <div className="min-w-[200px] flex-1 bg-[#181a20] p-[20px] rounded-xl border border-[#2b2f36]">
                              <div className="text-[12px] text-[#848e9c] mb-[8px]">总推送信号</div>
                              <div className="text-[24px] font-bold text-[#eaecef]">{metrics.overview?.total || 0}</div>
                          </div>
                          <div className="min-w-[200px] flex-1 bg-[#181a20] p-[20px] rounded-xl border border-[#2b2f36]">
                              <div className="text-[12px] text-[#848e9c] mb-[8px]">AI 拦截率</div>
                              <div className="text-[24px] font-bold text-[#eaecef]">
                                 {metrics.overview?.total && metrics.overview?.aiPass !== undefined ? Math.round((1 - metrics.overview.aiPass / metrics.overview.total) * 100) : 0}%
                              </div>
                              <div className="text-[11px] mt-[5px] text-[#848e9c]">有效减少无效开单</div>
                          </div>
                          <div className="min-w-[200px] flex-1 bg-[#181a20] p-[20px] rounded-xl border border-[#2b2f36]">
                              <div className="text-[12px] text-[#848e9c] mb-[8px]">综合胜率 (AI过滤后)</div>
                              <div className="text-[24px] font-bold text-[#eaecef]">
                                  {metrics.overview?.aiPass && metrics.overview?.wins !== undefined && metrics.overview.aiPass > 0 ? Math.round((metrics.overview.wins / metrics.overview.aiPass) * 100) : 0}%
                              </div>
                              <div className="text-[11px] mt-[5px] text-[#02c076]">WIN_TP1+ 达成率</div>
                          </div>
                          <div className="min-w-[200px] flex-1 bg-[#181a20] p-[20px] rounded-xl border border-[#2b2f36]">
                              <div className="text-[12px] text-[#848e9c] mb-[8px]">盈利单总数</div>
                              <div className="text-[24px] font-bold text-[#eaecef]">{metrics.overview?.wins || 0}</div>
                          </div>
                      </div>
                      
                      <section className="bg-[#181a20] border border-[#2b2f36] rounded-xl overflow-hidden max-h-[calc(100vh-270px)] flex flex-col">
                          <div className="p-[15px_20px] border-b border-[#2b2f36]">
                              <span className="text-[14px] font-semibold">基于类型的策略表现</span>
                          </div>
                          <div className="overflow-y-auto flex-1">
                              <table className="w-full text-left border-collapse">
                                   <thead className="sticky top-0 bg-[#181a20] z-0 shadow-sm border-b border-[#2b2f36]">
                                       <tr>
                                           <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">方向 - 类型</th>
                                           <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">总触发</th>
                                           <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">AI 通过</th>
                                           <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">盈利</th>
                                           <th className="px-[20px] py-[12px] text-[12px] text-[#848e9c] font-normal">当前胜率</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {metrics.stats?.map((st: any, i: number) => (
                                           <tr key={i} className="hover:bg-[#2b2f36]/30">
                                               <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] font-bold text-[#eaecef]">{st.direction} <span className="text-[#848e9c] font-normal ml-1">/ {st.signal_type}</span></td>
                                               <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] text-[#848e9c]">{st.total}</td>
                                               <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] text-[#eaecef]">{st.ai_passed}</td>
                                               <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] text-[#02c076] font-bold">{st.wins}</td>
                                               <td className="px-[20px] py-[14px] text-[13px] border-b border-[#2b2f36] font-bold text-[#f3ba2f]">
                                                   {st.ai_passed > 0 ? Math.round((st.wins / st.ai_passed) * 100) : 0}%
                                               </td>
                                           </tr>
                                       ))}
                                       {(!metrics.stats || metrics.stats.length === 0) && <tr><td colSpan={5} className="text-center py-[40px] text-[#848e9c]">暂无统计数据</td></tr>}
                                   </tbody>
                              </table>
                          </div>
                      </section>
                  </div>
              )}

              {activeTab === 'config' && (
                  <section className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-[30px] w-full max-w-[800px] overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[40px] gap-y-[24px]">
                          <div className="col-span-1 md:col-span-2 mt-2">
                              <h4 className="font-semibold text-[#eaecef] text-[14px] border-b border-[#2b2f36] pb-[10px] mb-[15px] flex items-center">
                                  <Settings2 className="w-4 h-4 mr-2 text-[#f3ba2f]" />
                                  扫描配置
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[40px] gap-y-[24px]">
                                  <div>
                                      <label className="block text-[13px] font-medium text-[#848e9c] mb-2">监控前 N 币种</label>
                                      <input type="number" 
                                          value={config.topN || ''} 
                                          onChange={e => setConfig({...config, topN: e.target.value})}
                                          className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg py-2.5 px-3.5 text-[#eaecef] focus:outline-none focus:border-[#f3ba2f] text-[14px] transition-colors" 
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-[13px] font-medium text-[#848e9c] mb-2">扫描间隔 (分钟)</label>
                                      <input type="number" 
                                           value={config.scanIntervalMin || ''} 
                                           onChange={e => setConfig({...config, scanIntervalMin: e.target.value})}
                                           className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg py-2.5 px-3.5 text-[#eaecef] focus:outline-none focus:border-[#f3ba2f] text-[14px] transition-colors" />
                                  </div>
                                  <div className="col-span-1 md:col-span-2">
                                      <label className="block text-[13px] font-medium text-[#848e9c] mb-2">手动增加监控交易对 (用逗号分隔，如 BTCUSDT,ETHUSDT)</label>
                                      <input type="text" 
                                           value={config.manualSymbols || ''} 
                                           onChange={e => setConfig({...config, manualSymbols: e.target.value.toUpperCase()})}
                                           placeholder="例如: PEPEUSDT,DOGEUSDT"
                                           className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg py-2.5 px-3.5 text-[#eaecef] focus:outline-none focus:border-[#f3ba2f] text-[14px] transition-colors" />
                                  </div>
                              </div>
                          </div>
                      
                          <div className="col-span-1 md:col-span-2 mt-4">
                              <h4 className="font-semibold text-[#eaecef] text-[14px] border-b border-[#2b2f36] pb-[10px] mb-[15px] flex items-center">
                                  <Bot className="w-4 h-4 mr-2 text-[#f3ba2f]" />
                                  AI 评估配置
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[40px] gap-y-[24px]">
                                  <div>
                                      <label className="block text-[13px] font-medium text-[#848e9c] mb-2">AI 评估提供商</label>
                                      <select 
                                          value={config.aiProvider || ''} 
                                          onChange={e => setConfig({...config, aiProvider: e.target.value})}
                                          className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg py-2.5 px-3.5 text-[#eaecef] focus:outline-none focus:border-[#f3ba2f] text-[14px] transition-colors">
                                          <option value="gpt">GPT-4o</option>
                                          <option value="deepseek">DeepSeek V3</option>
                                          <option value="gemini">Gemini Flash</option>
                                          <option value="both">双重确认</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[13px] font-medium text-[#848e9c] mb-2">AI 通过分阈值 1-100</label>
                                      <input type="number" 
                                           value={config.aiThreshold || ''} 
                                           onChange={e => setConfig({...config, aiThreshold: e.target.value})}
                                           className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg py-2.5 px-3.5 text-[#eaecef] focus:outline-none focus:border-[#f3ba2f] text-[14px] transition-colors" />
                                  </div>
                              </div>
                          </div>
                          
                          <div className="col-span-1 md:col-span-2 mt-2">
                              <h4 className="font-semibold text-[#eaecef] text-[14px] border-b border-[#2b2f36] pb-[10px] mb-[15px] flex items-center">
                                  <Bot className="w-4 h-4 mr-2 text-[#f3ba2f]" />
                                  策略过滤
                              </h4>
                              <div className="flex flex-col gap-4">
                                  <label className="flex items-center cursor-pointer group">
                                      <input type="checkbox" checked={config.vwapFilter === 'true'} onChange={e => setConfig({...config, vwapFilter: e.target.checked ? 'true' : 'false'})} className="sr-only peer" />
                                      <div className="w-[40px] h-[22px] bg-[#2b2f36] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#eaecef] after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#02c076] relative"></div>
                                      <span className="ml-3 text-[14px] text-[#eaecef] group-hover:text-white transition-colors">启用 VWAP 过滤</span>
                                  </label>
                                  <label className="flex items-center cursor-pointer group">
                                      <input type="checkbox" checked={config.volFilter === 'true'} onChange={e => setConfig({...config, volFilter: e.target.checked ? 'true' : 'false'})} className="sr-only peer" />
                                      <div className="w-[40px] h-[22px] bg-[#2b2f36] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#eaecef] after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#02c076] relative"></div>
                                      <span className="ml-3 text-[14px] text-[#eaecef] group-hover:text-white transition-colors">启用 成交量强化 过滤</span>
                                  </label>
                              </div>
                          </div>
                          
                          <div className="col-span-1 md:col-span-2 mt-2">
                              <h4 className="font-semibold text-[#eaecef] text-[14px] border-b border-[#2b2f36] pb-[10px] mb-[15px] flex items-center">
                                  <Send className="w-4 h-4 mr-2 text-[#02c076]" />
                                  Telegram 推送
                              </h4>
                              <div className="flex flex-col gap-5">
                                  <label className="flex items-center cursor-pointer group">
                                      <input type="checkbox" checked={config.telegramEnabled === 'true'} onChange={e => setConfig({...config, telegramEnabled: e.target.checked ? 'true' : 'false'})} className="sr-only peer" />
                                      <div className="w-[40px] h-[22px] bg-[#2b2f36] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#eaecef] after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#02c076] relative"></div>
                                      <span className="ml-3 text-[14px] text-[#eaecef] group-hover:text-white transition-colors">启用 Telegram 推送当信号产生</span>
                                  </label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[40px] gap-y-[20px]">
                                      <div>
                                          <label className="block text-[13px] font-medium text-[#848e9c] mb-2">Bot Token</label>
                                          <input type="password" 
                                               value={config.telegramToken || ''} 
                                               onChange={e => setConfig({...config, telegramToken: e.target.value})}
                                               placeholder="123456:ABCD..."
                                               className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg py-2.5 px-3.5 text-[#eaecef] focus:outline-none focus:border-[#f3ba2f] text-[14px] transition-colors" />
                                      </div>
                                      <div>
                                          <label className="block text-[13px] font-medium text-[#848e9c] mb-2">Chat ID</label>
                                          <input type="text" 
                                               value={config.telegramChatId || ''} 
                                               onChange={e => setConfig({...config, telegramChatId: e.target.value})}
                                               placeholder="-100..."
                                               className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg py-2.5 px-3.5 text-[#eaecef] focus:outline-none focus:border-[#f3ba2f] text-[14px] transition-colors" />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="mt-[40px] pt-[20px] border-t border-[#2b2f36]">
                          <button
                              onClick={saveConfig}
                              disabled={saving}
                              className="px-[30px] py-[12px] rounded border border-transparent text-[14px] font-bold text-[#181a20] bg-[#f3ba2f] hover:bg-[#eab308] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b0e11] focus:ring-[#f3ba2f] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {saving ? '保存配置中...' : '保存系统配置'}
                          </button>
                      </div>
                  </section>
              )}
          </main>
      </div>
  );
}
