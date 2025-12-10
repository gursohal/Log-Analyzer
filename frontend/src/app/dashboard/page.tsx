"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MethodsChart,
  SeverityChart,
  StatusCodeChart,
  TopIPsChart,
} from "./charts";

interface LogFile {
  id: string;
  filename: string;
  upload_date: string;
  status: string;
}

interface Anomaly {
  type: string;
  description: string;
  confidence: number;
  severity: string;
  timestamp?: string;
  isAI?: boolean;  // Flag to indicate if detected by AI
}

interface LogEntry {
  timestamp: string;
  ip: string;
  method: string;
  url: string;
  status: number;
  bytes: number;
  user_agent?: string;
}

interface TimelineEvent {
  timestamp: string;
  event_type: string;
  description: string;
  severity: string;
}

interface Analysis {
  total_entries: number;
  anomalies: Anomaly[];
  timeline?: TimelineEvent[];
  parsedLogs?: LogEntry[];
  aiAnalysisSkipped?: boolean;  // Flag if AI was skipped
  summary: {
    high_risk: number;
    medium_risk: number;
    low_risk: number;
    top_sources?: Array<{ ip: string; count: number }>;
    unique_ips?: number;
    error_rate?: number;
    status_distribution?: Record<string, number>;
    methods?: Record<string, number>;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'statistical' | 'ai'>('statistical');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Get user info from token
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser(payload);
      // Load existing log files
      fetchLogFiles();
    } catch (error) {
      console.error("Invalid token");
      router.push("/login");
    }
  }, [router]);

  const fetchLogFiles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/logs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogFiles(data);
      }
    } catch (error) {
      console.error("Error fetching log files:", error);
    }
  };

  const fetchAnalysis = async (fileId: string) => {
    setIsLoadingAnalysis(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/logs/${fileId}/analysis`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Analysis data:", data);

        // Transform backend data structure to frontend format
        const transformedAnalysis = {
          total_entries: data.analysis?.total_entries || 0,
          anomalies:
            data.anomalies?.map((a: any) => {
              // Extract event timestamp and AI flag from details
              let eventTimestamp = null;
              let isAI = false;
              try {
                const details =
                  typeof a.details === "string"
                    ? JSON.parse(a.details)
                    : a.details;
                eventTimestamp =
                  details?.event_timestamp ||
                  details?.timestamp ||
                  details?.firstAttempt;
                isAI = details?.ai_generated === true;
              } catch (e) {
                console.error("Error parsing anomaly details:", e);
              }

              return {
                type: a.anomaly_type || a.type,
                description: a.description,
                confidence: parseFloat(a.confidence_score || a.confidence || 0),
                severity: a.severity,
                timestamp: eventTimestamp, // Use actual log time
                isAI: isAI,  // AI-detected flag
              };
            }) || [],
          timeline: data.analysis?.timeline || [],
          parsedLogs: data.parsedLogs || [],
          // Use backend's pre-calculated summary (based on Statistical only)
          summary: {
            high_risk: data.analysis?.summary?.high_risk || 0,
            medium_risk: data.analysis?.summary?.medium_risk || 0,
            low_risk: data.analysis?.summary?.low_risk || 0,
            top_sources: data.analysis?.summary?.top_sources || [],
            unique_ips: data.analysis?.summary?.unique_ips || 0,
            error_rate: data.analysis?.summary?.error_rate || 0,
            status_distribution:
              data.analysis?.summary?.status_distribution || {},
            methods: data.analysis?.summary?.methods || {},
          },
        };

        setAnalysis(transformedAnalysis);
        setSelectedFile(fileId);
      } else {
        alert("Analysis not ready yet. Please try again in a moment.");
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      alert("Error loading analysis");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logFile", file);

    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/logs/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadProgress("✅ Upload complete! Analyzing logs...");
        // Refresh file list
        await fetchLogFiles();
        // Automatically fetch analysis with polling
        const fileId = data.fileId || data.id;
        if (fileId) {
          pollForAnalysis(fileId);
        }
      } else {
        const error = await response.json();
        setUploadProgress("");
        alert("Upload failed: " + (error.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const pollForAnalysis = async (fileId: string, attempts = 0) => {
    if (attempts > 20) {
      setUploadProgress("");
      alert(
        "Analysis is taking longer than expected. Please refresh manually."
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/logs/${fileId}/analysis`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.status === "completed") {
          setUploadProgress("✅ Analysis complete!");
          setTimeout(() => {
            fetchAnalysis(fileId);
            setUploadProgress("");
          }, 500);
        } else {
          setUploadProgress(`🔄 Processing... (${attempts + 1}s)`);
          setTimeout(() => pollForAnalysis(fileId, attempts + 1), 1000);
        }
      } else {
        setUploadProgress(`🔄 Processing... (${attempts + 1}s)`);
        setTimeout(() => pollForAnalysis(fileId, attempts + 1), 1000);
      }
    } catch (error) {
      setUploadProgress(`🔄 Processing... (${attempts + 1}s)`);
      setTimeout(() => pollForAnalysis(fileId, attempts + 1), 1000);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-orange-600 bg-orange-100";
      case "low":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Filter anomalies based on active tab
  const getFilteredAnomalies = () => {
    if (!analysis?.anomalies) return [];
    
    if (activeTab === 'statistical') {
      return analysis.anomalies.filter(a => !a.isAI);
    } else if (activeTab === 'ai') {
      return analysis.anomalies.filter(a => a.isAI);
    }
    return analysis.anomalies; // 'all'
  };

  // Calculate metrics for filtered anomalies
  const getFilteredMetrics = () => {
    const filtered = getFilteredAnomalies();
    
    const high_risk = filtered.filter(a => 
      a.severity?.toLowerCase() === 'critical' || a.severity?.toLowerCase() === 'high'
    ).length;
    
    const medium_risk = filtered.filter(a => 
      a.severity?.toLowerCase() === 'medium'
    ).length;
    
    const low_risk = filtered.filter(a => 
      a.severity?.toLowerCase() === 'low'
    ).length;
    
    return { high_risk, medium_risk, low_risk, total: filtered.length };
  };

  // Check if AI anomalies exist
  const hasAIAnomalies = () => {
    return analysis?.anomalies?.some(a => a.isAI) || false;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-blue-600 text-3xl mr-3">🛡️</div>
            <h1 className="text-2xl font-bold text-gray-900">
              Claude Log Analyzer
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">
              Welcome, {user.email || "User"}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upload Log File
          </h2>
          <p className="text-gray-600 mb-6">
            Upload your log files for AI-powered analysis and anomaly detection
          </p>

          {uploadProgress ? (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-center animate-pulse">
              <div className="text-3xl mb-3">
                {uploadProgress.includes("✅") ? "✅" : "🔄"}
              </div>
              <p className="text-xl font-semibold text-white">
                {uploadProgress}
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <div className="text-6xl mb-4">📁</div>
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-semibold">
                  {isUploading ? "Uploading..." : "Click to upload"}
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".log,.txt"
                  onChange={handleFileUpload}
                  disabled={isUploading || uploadProgress !== ""}
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                Supports .log and .txt files (Max 50MB)
              </p>
            </div>
          )}
        </div>

        {/* Log Files List */}
        {logFiles.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Log Files
            </h2>
            <div className="space-y-4">
              {logFiles.map((file) => (
                <div
                  key={file.id}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedFile === file.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => fetchAnalysis(file.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {file.filename}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Uploaded: {new Date(file.upload_date).toLocaleString()}
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      View Analysis
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {isLoadingAnalysis && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-xl">Loading analysis...</p>
            </div>
          </div>
        )}

        {analysis && selectedFile && !isLoadingAnalysis && (
          <div className="space-y-6">
            {/* Statistics - Always based on Statistical only, not affected by tab */}
            <div className="grid md:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="text-3xl font-bold mb-2">
                  {analysis.total_entries}
                </div>
                <div className="text-blue-100">Total Entries</div>
              </div>

              <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-lg p-6 text-white">
                <div className="text-3xl font-bold mb-2">
                  {analysis.anomalies?.filter(a => !a.isAI).length || 0}
                </div>
                <div className="text-gray-100">Total Threats</div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
                <div className="text-3xl font-bold mb-2">
                  {analysis.anomalies?.filter(a => !a.isAI && a.severity?.toLowerCase() === 'critical').length || 0}
                </div>
                <div className="text-purple-100">Critical</div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                <div className="text-3xl font-bold mb-2">
                  {analysis.anomalies?.filter(a => !a.isAI && a.severity?.toLowerCase() === 'high').length || 0}
                </div>
                <div className="text-red-100">High</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="text-3xl font-bold mb-2">
                  {analysis.summary?.medium_risk || 0}
                </div>
                <div className="text-orange-100">Medium</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
                <div className="text-3xl font-bold mb-2">
                  {analysis.summary?.low_risk || 0}
                </div>
                <div className="text-yellow-100">Low</div>
              </div>
            </div>

            {/* Visual Analytics Section - All Charts Combined */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                📊 Visual Analytics
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Threat Severity Distribution */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Threat Severity Distribution
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <SeverityChart
                      data={{
                        critical:
                          analysis.anomalies?.filter(
                            (a) => !a.isAI && a.severity?.toLowerCase() === "critical"
                          ).length || 0,
                        high:
                          analysis.anomalies?.filter(
                            (a) => !a.isAI && a.severity?.toLowerCase() === "high"
                          ).length || 0,
                        medium:
                          analysis.anomalies?.filter(
                            (a) => !a.isAI && a.severity?.toLowerCase() === "medium"
                          ).length || 0,
                        low:
                          analysis.anomalies?.filter(
                            (a) => !a.isAI && a.severity?.toLowerCase() === "low"
                          ).length || 0,
                      }}
                    />
                  </div>
                </div>

                {/* Top Source IPs */}
                {analysis.summary?.top_sources &&
                  analysis.summary.top_sources.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Top 10 Source IPs by Request Volume
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <TopIPsChart
                          topSources={analysis.summary.top_sources}
                        />
                      </div>
                    </div>
                  )}

                {/* HTTP Status Codes */}
                {analysis.summary?.status_distribution && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      HTTP Status Code Distribution
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <StatusCodeChart
                        statusCodes={analysis.summary.status_distribution}
                      />
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>2xx: Success</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>3xx: Redirection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span>4xx: Client Error</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>5xx: Server Error</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* HTTP Methods */}
                {analysis.summary?.methods && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      HTTP Methods Distribution
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <MethodsChart methods={analysis.summary.methods} />
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p>
                        <strong>GET</strong>: Read operations
                      </p>
                      <p>
                        <strong>POST</strong>: Create operations
                      </p>
                      <p>
                        <strong>PUT/PATCH</strong>: Update operations
                      </p>
                      <p>
                        <strong>DELETE</strong>: Delete operations
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {analysis.timeline && analysis.timeline.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  📅 Timeline of Events
                </h2>
                <div className="space-y-4">
                  {analysis.timeline.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 border-l-4 border-blue-500 pl-4"
                    >
                      <div className="flex-shrink-0 w-32 text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              event.severity === "critical" ||
                              event.severity === "high"
                                ? "bg-red-100 text-red-600"
                                : event.severity === "medium"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {event.event_type}
                          </span>
                        </div>
                        <p className="text-gray-700">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anomalies with Tabs */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                � Detected Anomalies
              </h2>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('statistical')}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                      activeTab === 'statistical'
                        ? 'border-gray-500 text-gray-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📊 Statistical ({analysis.anomalies?.filter(a => !a.isAI).length || 0})
                  </button>
                  
                  {hasAIAnomalies() && (
                    <button
                      onClick={() => setActiveTab('ai')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                        activeTab === 'ai'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      🤖 AI Powered ({analysis.anomalies?.filter(a => a.isAI).length || 0})
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Description */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                {activeTab === 'statistical' && (
                  <p className="text-sm text-gray-600">
                    📊 Pattern-matching detections using regex and statistical analysis for 9 known attack types
                  </p>
                )}
                {activeTab === 'ai' && (
                  <p className="text-sm text-gray-600">
                    🤖 Claude-powered detections with contextual analysis, multi-stage attack correlation, and natural language explanations
                  </p>
                )}
              </div>

              {/* Anomalies Table - Filtered by Tab */}
              {(() => {
                const filteredAnomalies = getFilteredAnomalies();
                
                return filteredAnomalies.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Severity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Confidence
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAnomalies.map((anomaly, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${
                            anomaly.isAI ? 'bg-purple-50/20' : ''
                          }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {anomaly.isAI ? (
                                  <span className="px-2 py-1 bg-purple-500 text-white rounded text-xs font-bold">
                                    🤖
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs font-bold">
                                    📊
                                  </span>
                                )}
                                <span className="text-sm font-medium text-gray-900">
                                  {anomaly.type}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-md">
                                {anomaly.description}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(anomaly.severity)}`}>
                                {anomaly.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-blue-600">
                                {Math.round(anomaly.confidence)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">✅</div>
                    <p className="text-xl">
                      No anomalies in this category
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Instructions */}
        {logFiles.length === 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              🚀 Getting Started
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Upload a log file using the upload section above</li>
              <li>
                Wait for the analysis to complete (typically 10-30 seconds)
              </li>
              <li>View detected anomalies and insights in the results</li>
              <li>Click on any uploaded file to view its analysis again</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
