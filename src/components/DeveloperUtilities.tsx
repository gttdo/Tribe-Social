import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Activity, 
  Database, 
  Network, 
  Bug, 
  Monitor, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { HealthMonitoringService } from '../utils/health-monitoring-system';
import { ValidationService } from '../utils/enhanced-validation-system';

interface DevUtilitiesProps {
  onClose: () => void;
}

export function DeveloperUtilities({ onClose }: DevUtilitiesProps) {
  const [healthData, setHealthData] = useState<any>(null);
  const [validationData, setValidationData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [health, validation] = await Promise.all([
        HealthMonitoringService.getHealthReport(),
        Promise.resolve(ValidationService.generateReport())
      ]);
      
      setHealthData(health);
      setValidationData(validation);
    } catch (error) {
      console.error('Error refreshing dev utilities data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      health: healthData,
      validation: validationData,
      userAgent: navigator.userAgent,
      url: window.location.href,
      performance: HealthMonitoringService.performance.getMetrics(),
      memory: HealthMonitoringService.memory.getCurrentUsage()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tribe-board-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearCaches = () => {
    ValidationService.uuid.clearCache();
    ValidationService.uuid.resetMetrics();
    localStorage.removeItem('tribe-debug-data');
    refreshData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Monitor className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!healthData || !validationData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-midnight-black border border-neon-lilac/30 rounded-xl p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-neon-lilac" />
            <span className="text-pearl-white">Loading developer utilities...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-hidden">
      <div className="h-full max-w-6xl mx-auto p-4">
        <Card className="h-full bg-midnight-black border-neon-lilac/30">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-pearl-white font-headline">Developer Utilities</CardTitle>
              <CardDescription className="text-muted-lavender">
                App health, performance, and debugging tools
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={refreshData}
                disabled={isRefreshing}
                className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportData}
                className="border-soft-blush/30 text-soft-blush hover:bg-soft-blush/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 min-h-0">
            <Tabs defaultValue="health" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="health" className="flex items-center space-x-1">
                  <Activity className="w-4 h-4" />
                  <span>Health</span>
                </TabsTrigger>
                <TabsTrigger value="validation" className="flex items-center space-x-1">
                  <Bug className="w-4 h-4" />
                  <span>Validation</span>
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>Performance</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex items-center space-x-1">
                  <Monitor className="w-4 h-4" />
                  <span>Tools</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0">
                <TabsContent value="health" className="h-full mt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      {/* Overall Status */}
                      <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(healthData.overall)}
                          <div>
                            <h3 className="font-medium text-pearl-white">Overall Health</h3>
                            <p className="text-sm text-muted-lavender">
                              Score: {healthData.score}/100
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(healthData.overall)}>
                          {healthData.overall.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {healthData.metrics.map((metric: any, index: number) => (
                          <div
                            key={index}
                            className="p-4 bg-card rounded-lg border border-border"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-pearl-white">
                                {metric.name}
                              </span>
                              {getStatusIcon(metric.status)}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-mono text-electric-blue">
                                {metric.value.toFixed(2)}
                              </span>
                              <span className="text-sm text-muted-lavender">
                                {metric.unit}
                              </span>
                            </div>
                            {metric.threshold && (
                              <div className="mt-2 text-xs text-muted-lavender">
                                Warning: {metric.threshold.warning}{metric.unit} • 
                                Critical: {metric.threshold.critical}{metric.unit}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Recommendations */}
                      {healthData.recommendations.length > 0 && (
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <h3 className="font-medium text-pearl-white mb-3 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                            Recommendations
                          </h3>
                          <ul className="space-y-2">
                            {healthData.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-sm text-muted-lavender flex items-start">
                                <span className="text-yellow-400 mr-2">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="validation" className="h-full mt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <h3 className="font-medium text-pearl-white mb-2">UUID Validations</h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Total:</span>
                              <span className="text-electric-blue font-mono">
                                {validationData.uuid.validations}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Cache Hits:</span>
                              <span className="text-electric-blue font-mono">
                                {validationData.uuid.cacheHits}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Invalid Count:</span>
                              <span className="text-glitch-red font-mono">
                                {validationData.uuid.invalidCount}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Cache Hit Rate:</span>
                              <span className="text-electric-blue font-mono">
                                {(validationData.uuid.cacheHitRate * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-card rounded-lg border border-border">
                          <h3 className="font-medium text-pearl-white mb-2">Cache Info</h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Cache Size:</span>
                              <span className="text-electric-blue font-mono">
                                {validationData.uuid.cacheSize}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {validationData.uuid.commonErrors.length > 0 && (
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <h3 className="font-medium text-pearl-white mb-3">Common Errors</h3>
                          <div className="space-y-2">
                            {validationData.uuid.commonErrors.map(([error, count]: [string, number], index: number) => (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-muted-lavender flex-1 mr-2">
                                  {error}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {count}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {validationData.recommendations.length > 0 && (
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <h3 className="font-medium text-pearl-white mb-3">Recommendations</h3>
                          <ul className="space-y-2">
                            {validationData.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-sm text-muted-lavender flex items-start">
                                <span className="text-yellow-400 mr-2">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="performance" className="h-full mt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <h3 className="font-medium text-pearl-white mb-3 flex items-center">
                            <Network className="w-4 h-4 mr-2" />
                            Network
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Avg Response:</span>
                              <span className="text-electric-blue font-mono">
                                {HealthMonitoringService.network.getAverageRequestTime().toFixed(0)}ms
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Online Status:</span>
                              <Badge className={navigator.onLine ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                {navigator.onLine ? 'ONLINE' : 'OFFLINE'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-card rounded-lg border border-border">
                          <h3 className="font-medium text-pearl-white mb-3 flex items-center">
                            <Database className="w-4 h-4 mr-2" />
                            Memory
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-lavender">Usage:</span>
                              <span className="text-electric-blue font-mono">
                                {HealthMonitoringService.memory.getCurrentUsage().value.toFixed(1)}MB
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <h3 className="font-medium text-pearl-white mb-3">Performance Timings</h3>
                        <div className="space-y-2">
                          {Array.from(HealthMonitoringService.performance.getMetrics().entries()).map(([name, values]) => (
                            <div key={name} className="flex items-center justify-between">
                              <span className="text-sm text-muted-lavender">{name}:</span>
                              <span className="text-sm text-electric-blue font-mono">
                                {values.length > 0 ? `${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}ms avg` : 'No data'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tools" className="h-full mt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={clearCaches}
                        variant="outline"
                        className="h-auto p-4 flex-col items-start border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <XCircle className="w-4 h-4" />
                          <span>Clear Caches</span>
                        </div>
                        <span className="text-xs text-muted-lavender">
                          Clears validation cache and metrics
                        </span>
                      </Button>

                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="h-auto p-4 flex-col items-start border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <RefreshCw className="w-4 h-4" />
                          <span>Hard Refresh</span>
                        </div>
                        <span className="text-xs text-muted-lavender">
                          Reloads the entire application
                        </span>
                      </Button>
                    </div>

                    <div className="p-4 bg-card rounded-lg border border-border">
                      <h3 className="font-medium text-pearl-white mb-3">System Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-lavender">User Agent:</span>
                          <p className="text-xs text-pearl-white break-all font-mono mt-1">
                            {navigator.userAgent}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-lavender">URL:</span>
                          <p className="text-xs text-pearl-white break-all font-mono mt-1">
                            {window.location.href}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}