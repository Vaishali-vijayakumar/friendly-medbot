import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  Settings, 
  Info, 
  Send, 
  Paperclip, 
  Lock,
  AlertTriangle,
  User,
  Pill,
  Syringe,
  Activity,
  AlertCircle
} from "lucide-react";
import type { Message, Conversation } from "@shared/schema";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
}

const quickActions: QuickAction[] = [
  { id: "symptoms", label: "Common Symptoms", icon: "💊", action: "symptoms" },
  { id: "medications", label: "Medication Info", icon: "💉", action: "medications" },
  { id: "wellness", label: "Wellness Tips", icon: "🏃‍♂️", action: "wellness" },
  { id: "emergency", label: "Emergency Info", icon: "🚨", action: "emergency" },
];

export default function Chat() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create initial conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        userId: "anonymous",
        title: "MedAssist Chat"
      });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setConversationId(conversation.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start conversation. Please refresh the page.",
        variant: "destructive",
      });
    }
  });

  // Get messages for conversation
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation");
      
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      setMessageInput("");
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    }
  });

  // Quick action mutation
  const quickActionMutation = useMutation({
    mutationFn: async (action: string) => {
      const response = await apiRequest("POST", "/api/quick-actions", { action });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (data: { content: string }) => {
      if (conversationId) {
        // Add the quick action response as an assistant message
        const fakeAssistantMessage: Message = {
          id: Date.now(),
          conversationId,
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
          isTyping: false,
        };
        
        queryClient.setQueryData(["/api/conversations", conversationId, "messages"], (old: Message[] = []) => [
          ...old,
          fakeAssistantMessage,
        ]);
      }
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get quick action response",
        variant: "destructive",
      });
    }
  });

  // Initialize conversation on mount
  useEffect(() => {
    if (!conversationId) {
      createConversationMutation.mutate();
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [messageInput]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  const handleQuickAction = (action: string) => {
    quickActionMutation.mutate(action);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date | string | null) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-medical-blue rounded-full mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">MedAssist AI</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your intelligent healthcare companion. Ask questions about symptoms, medications, wellness tips, and general health information.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Available 24/7</Badge>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Evidence-Based</Badge>
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Confidential</Badge>
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-3xl mx-auto">
          {/* Chat Header */}
          <div className="bg-medical-blue text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Dr. MedAssist</h3>
                  <p className="text-blue-100 text-sm flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Online • Ready to help
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-20">
                  <Info className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-20">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 bg-gray-50 border-b">
            <p className="text-sm text-gray-600 mb-3 font-medium">Quick Questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.action)}
                  disabled={quickActionMutation.isPending}
                  className="bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border shadow-sm"
                >
                  <span className="mr-2">{action.icon}</span>
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="h-96 md:h-[32rem] overflow-y-auto p-6 space-y-4">
            {/* Welcome Message */}
            <div className="flex items-start space-x-3 animate-fade-in">
              <div className="w-8 h-8 bg-medical-blue rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-bot-bg rounded-2xl rounded-tl-md p-4 shadow-sm">
                  <p className="text-gray-800">
                    👋 Hello! I'm Dr. MedAssist, your AI healthcare companion. I can help you with general health questions, symptom information, wellness advice, and medication guidance.
                    <br /><br />
                    ⚠️ <strong>Important:</strong> I provide general information only and cannot replace professional medical advice. For emergencies, please call your local emergency services immediately.
                    <br /><br />
                    How can I assist you today?
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-1">Just now</p>
              </div>
            </div>

            {/* Chat Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 animate-fade-in ${
                  message.role === "user" ? "justify-end" : ""
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-medical-blue rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`flex-1 ${message.role === "user" ? "max-w-xs md:max-w-md" : ""}`}>
                  <div
                    className={`rounded-2xl p-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-user-bg text-white rounded-tr-md"
                        : "bg-bot-bg text-gray-800 rounded-tl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className={`text-xs text-gray-500 mt-1 ${message.role === "user" ? "text-right mr-1" : "ml-1"}`}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-3 animate-fade-in">
                <div className="w-8 h-8 bg-medical-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-bot-bg rounded-2xl rounded-tl-md p-4 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me about symptoms, medications, wellness tips, or general health questions..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 min-h-[48px]"
                    rows={1}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 bottom-2 p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-gray-500 flex items-center">
                    <Lock className="w-3 h-3 mr-1" />
                    Secure & Confidential
                  </p>
                  <p className="text-xs text-gray-400">{messageInput.length}/2000 characters</p>
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                className="bg-medical-blue text-white hover:bg-blue-700 p-3 rounded-full shadow-lg disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Disclaimer */}
        <div className="mt-6 text-center">
          <Card className="max-w-2xl mx-auto p-4 bg-white bg-opacity-80 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <h3 className="font-semibold text-gray-800">Medical Disclaimer</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              This AI assistant provides general health information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical concerns. In case of emergency, contact emergency services immediately.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
