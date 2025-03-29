import { AppSidebar } from "@/components/app/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Archive, ChevronDown, Inbox, Mail, MessageCircle, Search, 
  Send, Trash2, Star, AlertCircle, PaperclipIcon, X, Menu,
  Reply, ReplyAll, Forward, Download, Flag, MoreHorizontal
} from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

type MessageFolder = 'inbox' | 'sent' | 'drafts' | 'important' | 'archived' | 'trash';

interface Attachment {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface EmailAddress {
  name: string;
  email: string;
}

interface EmailMessage {
  id: number;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  preview: string;
  date: Date;
  read: boolean;
  starred: boolean;
  important: boolean;
  folder: MessageFolder;
  attachments: Attachment[];
  headers: Record<string, string>;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
}

const Messages = () => {
  const [currentFolder, setCurrentFolder] = useState<MessageFolder>('inbox');
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  const [recipients, setRecipients] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [bcc, setBcc] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // Mock email messages with more email-like structure
  const messages: EmailMessage[] = [
    {
      id: 1,
      from: { name: "John Smith", email: "john.smith@school.edu" },
      to: [{ name: user?.full_name || "Current User", email: user?.email || "user@school.edu" }],
      subject: "Project Update Meeting",
      body: `<p>Hi team,</p>
      <p>Just wanted to share a quick update on the project status. We're making good progress on the key deliverables.</p>
      <p>Let's schedule a meeting to discuss the next steps. How does tomorrow at 2 PM sound?</p>
      <p>Best regards,<br/>John</p>`,
      preview: "Hi team, Just wanted to share a quick update on the project status...",
      date: new Date(2025, 2, 26, 10, 30),
      read: false,
      starred: true,
      important: true,
      folder: 'inbox',
      attachments: [],
      headers: {
        "Message-ID": "<abc123@school.edu>",
        "Date": "Wed, 26 Mar 2025 10:30:00 +0530",
        "Content-Type": "text/html; charset=UTF-8"
      },
      messageId: "<abc123@school.edu>"
    },
    {
      id: 2,
      from: { name: "Sarah Johnson", email: "sarah.johnson@school.edu" },
      to: [{ name: user?.full_name || "Current User", email: user?.email || "user@school.edu" }],
      subject: "Weekly Report - Q1 Results",
      body: `<p>Hello,</p>
      <p>Please find attached the weekly performance report for Q1. The results are very promising!</p>
      <p>Key highlights:</p>
      <ul>
        <li>15% increase in student engagement</li>
        <li>Improved test scores across all grades</li>
        <li>Successful implementation of new curriculum</li>
      </ul>
      <p>Let me know if you have any questions.</p>
      <p>Regards,<br/>Sarah</p>`,
      preview: "Please find attached the weekly performance report for Q1...",
      date: new Date(2025, 2, 25, 14, 15),
      read: true,
      starred: false,
      important: false,
      folder: 'inbox',
      attachments: [
        {
          id: "att1",
          name: "Q1_Report.pdf",
          size: 2456000,
          type: "application/pdf",
          file: new File([""], "Q1_Report.pdf", { type: "application/pdf" }),
          url: "#"
        }
      ],
      headers: {
        "Message-ID": "<def456@school.edu>",
        "Date": "Tue, 25 Mar 2025 14:15:00 +0530",
        "Content-Type": "multipart/mixed; boundary=boundary123"
      },
      messageId: "<def456@school.edu>"
    },
    {
      id: 3,
      from: { name: user?.full_name || "Current User", email: user?.email || "user@school.edu" },
      to: [{ name: "Tech Support", email: "support@school.edu" }],
      subject: "RE: System Maintenance Notice",
      body: `<p>Thank you for the update. Glad to hear the maintenance was completed successfully.</p>
      <p>Best regards,<br/>${user?.full_name || "Current User"}</p>
      <p>-------- Original Message --------</p>
      <p>From: Tech Support &lt;support@school.edu&gt;<br/>
      Date: Mon, 20 Mar 2025 09:00:00 +0530<br/>
      Subject: System Maintenance Notice</p>
      <p>The scheduled maintenance has been completed successfully. All systems are now operational.</p>`,
      preview: "The scheduled maintenance has been completed successfully...",
      date: new Date(2025, 2, 20, 10, 0),
      read: true,
      starred: false,
      important: false,
      folder: 'sent',
      attachments: [],
      headers: {
        "Message-ID": "<ghi789@school.edu>",
        "In-Reply-To": "<maint123@school.edu>",
        "References": "<maint123@school.edu>",
        "Date": "Mon, 20 Mar 2025 10:00:00 +0530",
        "Content-Type": "text/html; charset=UTF-8"
      },
      messageId: "<ghi789@school.edu>",
      inReplyTo: "<maint123@school.edu>",
      references: ["<maint123@school.edu>"]
    },
  ];

  const handleAttachFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newAttachments = Array.from(files).map(file => ({
        file,
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };

  const handleSendMessage = () => {
    setLoading(true);
    
    // Simulate HTTP request to send email
    setTimeout(() => {
      // In a real app, this would be an API call to send the email
      console.log('Sending message with:', {
        from: user?.email || "user@school.edu",
        to: recipients.split(',').map(email => email.trim()),
        cc: cc ? cc.split(',').map(email => email.trim()) : [],
        bcc: bcc ? bcc.split(',').map(email => email.trim()) : [],
        subject,
        body: messageBody,
        attachments,
        mode: composeMode,
        inReplyTo: selectedMessage?.messageId,
        references: selectedMessage?.references || []
      });
      
      setComposeOpen(false);
      setAttachments([]);
      setRecipients("");
      setCc("");
      setBcc("");
      setSubject("");
      setMessageBody("");
      setShowCc(false);
      setShowBcc(false);
      setLoading(false);
      
      // Show success message (in a real app)
      alert("Message sent successfully!");
    }, 1500);
  };

  const getFolderIcon = (folder: MessageFolder) => {
    switch (folder) {
      case 'inbox':
        return <Inbox className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'drafts':
        return <Mail className="h-4 w-4" />;
      case 'important':
        return <AlertCircle className="h-4 w-4" />;
      case 'archived':
        return <Archive className="h-4 w-4" />;
      case 'trash':
        return <Trash2 className="h-4 w-4" />;
    }
  };

  const getFolderMessages = () => {
    return messages.filter(message => {
      if (currentFolder === 'important') return message.important;
      return message.folder === currentFolder;
    });
  };

  const toggleStar = (messageId: number) => {
    // In a real app, this would update the message in the database
    console.log('Toggle star for message:', messageId);
  };

  const toggleImportant = (messageId: number) => {
    // In a real app, this would update the message in the database
    console.log('Toggle important for message:', messageId);
  };

  const moveToFolder = (folder: MessageFolder) => {
    // In a real app, this would update the messages in the database
    console.log('Move selected messages to folder:', folder);
    setSelectedMessages([]);
  };

  const handleReply = (message: EmailMessage) => {
    setSelectedMessage(message);
    setComposeMode('reply');
    setRecipients(message.from.email);
    setSubject(`Re: ${message.subject}`);
    setMessageBody(`\n\n-------- Original Message --------\nFrom: ${message.from.name} <${message.from.email}>\nDate: ${format(message.date, "EEE, dd MMM yyyy HH:mm:ss")}\nSubject: ${message.subject}\n\n${message.body.replace(/<[^>]*>/g, '')}`);
    setComposeOpen(true);
  };

  const handleReplyAll = (message: EmailMessage) => {
    setSelectedMessage(message);
    setComposeMode('replyAll');
    
    // Get all recipients except current user
    const allRecipients = [
      message.from.email,
      ...message.to
        .filter(recipient => recipient.email !== user?.email)
        .map(recipient => recipient.email)
    ].join(', ');
    
    // Set CC recipients if they exist
    if (message.cc && message.cc.length > 0) {
      setCc(message.cc.map(recipient => recipient.email).join(', '));
      setShowCc(true);
    }
    
    setRecipients(allRecipients);
    setSubject(`Re: ${message.subject}`);
    setMessageBody(`\n\n-------- Original Message --------\nFrom: ${message.from.name} <${message.from.email}>\nDate: ${format(message.date, "EEE, dd MMM yyyy HH:mm:ss")}\nSubject: ${message.subject}\n\n${message.body.replace(/<[^>]*>/g, '')}`);
    setComposeOpen(true);
  };

  const handleForward = (message: EmailMessage) => {
    setSelectedMessage(message);
    setComposeMode('forward');
    setRecipients('');
    setSubject(`Fwd: ${message.subject}`);
    setMessageBody(`\n\n-------- Forwarded Message --------\nFrom: ${message.from.name} <${message.from.email}>\nDate: ${format(message.date, "EEE, dd MMM yyyy HH:mm:ss")}\nSubject: ${message.subject}\nTo: ${message.to.map(to => `${to.name} <${to.email}>`).join(', ')}\n\n${message.body.replace(/<[^>]*>/g, '')}`);
    
    // Forward attachments
    if (message.attachments.length > 0) {
      setAttachments(message.attachments);
    }
    
    setComposeOpen(true);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
      return format(date, "h:mm a");
    } else if (date >= yesterday) {
      return "Yesterday";
    } else {
      return format(date, "MMM d");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Folder selector for mobile
  const FolderSelector = () => (
    <Sheet open={foldersOpen} onOpenChange={setFoldersOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden flex items-center gap-2">
          {getFolderIcon(currentFolder)}
          <span className="capitalize">{currentFolder}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[40vh]">
        <div className="flex flex-col gap-2 pt-4">
          {(['inbox', 'sent', 'drafts', 'important', 'archived', 'trash'] as MessageFolder[]).map((folder) => (
            <Button
              key={folder}
              variant={currentFolder === folder ? "secondary" : "ghost"}
              className="justify-start gap-2 w-full"
              onClick={() => {
                setCurrentFolder(folder);
                setFoldersOpen(false);
              }}
            >
              {getFolderIcon(folder)}
              <span className="capitalize">{folder}</span>
              {folder === 'inbox' && <Badge variant="secondary">3</Badge>}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="border-b px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1)}
              </h1>
              <FolderSelector />
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={() => {
                  setComposeMode('new');
                  setSelectedMessage(null);
                  setRecipients("");
                  setCc("");
                  setBcc("");
                  setSubject("");
                  setMessageBody("");
                  setAttachments([]);
                  setComposeOpen(true);
                }}
                size={isMobile ? "sm" : "default"}
              >
                <PaperclipIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Compose</span>
              </Button>
            </div>
            <div className="flex items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  className="pl-10 w-full" 
                  placeholder="Search messages..." 
                  type="search"
                />
              </div>
            </div>
          </header>

          {/* Mail Folders - Desktop */}
          <div className="border-b bg-white px-6 py-2 hidden md:block">
            <div className="flex items-center gap-4 overflow-x-auto">
              {(['inbox', 'sent', 'drafts', 'important', 'archived', 'trash'] as MessageFolder[]).map((folder) => (
                <Button
                  key={folder}
                  variant={currentFolder === folder ? "secondary" : "ghost"}
                  className="gap-2 whitespace-nowrap"
                  onClick={() => setCurrentFolder(folder)}
                >
                  {getFolderIcon(folder)}
                  <span className="capitalize">{folder}</span>
                  {folder === 'inbox' && <Badge variant="secondary">3</Badge>}
                </Button>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="p-2 border-b bg-white sticky top-[72px] z-10">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => moveToFolder('archived')}
                disabled={selectedMessages.length === 0}
                className="hover:bg-gray-100"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => moveToFolder('trash')}
                disabled={selectedMessages.length === 0}
                className="hover:bg-gray-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                <Mail className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content Area with Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Messages List */}
            <div className={`${selectedMessage ? 'hidden md:block md:w-1/3 lg:w-2/5' : 'w-full'} border-r`}>
              <ScrollArea className="h-full">
                <div className="divide-y divide-gray-200">
                  {getFolderMessages().map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        message.read ? "" : "bg-blue-50"
                      } ${selectedMessage?.id === message.id ? 'bg-blue-100' : ''}`}
                      onClick={() => setSelectedMessage(message)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(message.id);
                        }}
                        className={`h-6 w-6 ${message.starred ? "text-yellow-400" : "text-gray-400"} hidden sm:flex`}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      
                      <Avatar className="h-8 w-8 border shrink-0">
                        <AvatarImage src={message.from.name[0]} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {message.from.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`truncate ${!message.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                            {message.from.name}
                          </span>
                          {message.important && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hidden sm:inline-flex">
                              Important
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500 whitespace-nowrap sm:hidden">
                            {formatDate(message.date)}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-2">
                          <span className={`truncate ${!message.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                            {message.subject}
                          </span>
                          <span className="text-gray-500 truncate hidden sm:inline">
                            - {message.preview}
                          </span>
                        </div>
                        <span className="text-gray-500 text-sm line-clamp-1 sm:hidden">
                          {message.preview}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(message.id);
                          }}
                          className={`h-6 w-6 ${message.starred ? "text-yellow-400" : "text-gray-400"} sm:hidden`}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-500 whitespace-nowrap ml-4 hidden sm:inline">
                          {formatDate(message.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Message View */}
            {selectedMessage && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{selectedMessage.subject}</h2>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedMessage(null)}
                      className="md:hidden"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={selectedMessage.from.name[0]} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {selectedMessage.from.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{selectedMessage.from.name}</div>
                          <div className="text-sm text-gray-500">{selectedMessage.from.email}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(selectedMessage.date, "EEE, MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">To:</span> {selectedMessage.to.map(to => `${to.name} <${to.email}>`).join(', ')}
                      </div>
                      
                      {selectedMessage.cc && selectedMessage.cc.length > 0 && (
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">CC:</span> {selectedMessage.cc.map(cc => `${cc.name} <${cc.email}>`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => handleReply(selectedMessage)}
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => handleReplyAll(selectedMessage)}
                    >
                      <ReplyAll className="h-4 w-4" />
                      Reply All
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => handleForward(selectedMessage)}
                    >
                      <Forward className="h-4 w-4" />
                      Forward
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => toggleImportant(selectedMessage.id)}
                    >
                      <Flag className={`h-4 w-4 ${selectedMessage.important ? "text-yellow-500" : ""}`} />
                      {selectedMessage.important ? "Unmark Important" : "Mark as Important"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => moveToFolder('trash')}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {/* Message Body */}
                  <div 
                    className="prose prose-blue max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.body }}
                  />
                  
                  {/* Attachments */}
                  {selectedMessage.attachments.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-sm font-medium mb-3">Attachments ({selectedMessage.attachments.length})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedMessage.attachments.map((attachment) => (
                          <div 
                            key={attachment.id}
                            className="flex items-center gap-3 p-3 border rounded-lg"
                          >
                            <div className="bg-blue-100 p-2 rounded">
                              <PaperclipIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{attachment.name}</div>
                              <div className="text-sm text-gray-500">{formatFileSize(attachment.size)}</div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Email Headers (collapsed by default) */}
                  <div className="mt-6 border-t pt-4">
                    <details className="text-sm text-gray-500">
                      <summary className="cursor-pointer font-medium">Show email headers</summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded-md font-mono text-xs overflow-x-auto">
                        {Object.entries(selectedMessage.headers).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="font-semibold">{key}:</span> {value}
                          </div>
                        ))}
                        {selectedMessage.inReplyTo && (
                          <div className="mb-1">
                            <span className="font-semibold">In-Reply-To:</span> {selectedMessage.inReplyTo}
                          </div>
                        )}
                        {selectedMessage.references && selectedMessage.references.length > 0 && (
                          <div className="mb-1">
                            <span className="font-semibold">References:</span> {selectedMessage.references.join(' ')}
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Compose Dialog */}
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogContent className="sm:max-w-[600px] w-[95vw] max-w-full mx-auto">
              <DialogHeader>
                <DialogTitle>
                  {composeMode === 'new' ? 'New Message' : 
                   composeMode === 'reply' ? 'Reply' : 
                   composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">To:</label>
                  <div className="flex gap-2">
                    {!showCc && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowCc(true)}
                      >
                        Add CC
                      </Button>
                    )}
                    {!showBcc && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowBcc(true)}
                      >
                        Add BCC
                      </Button>
                    )}
                  </div>
                </div>
                <Input 
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="Recipients" 
                />
                {showCc && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-10">CC:</label>
                    <Input 
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="CC Recipients" 
                      className="flex-1"
                    />
                  </div>
                )}
                {showBcc && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-10">BCC:</label>
                    <Input 
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="BCC Recipients" 
                      className="flex-1"
                    />
                  </div>
                )}
                <Input 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject" 
                />
                <Textarea 
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write your message here..." 
                  className="min-h-[200px]"
                />
                
                {/* Attachments */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((attachment) => (
                        <div 
                          key={attachment.id}
                          className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1"
                        >
                          <span className="text-sm truncate max-w-[150px] sm:max-w-[200px]">
                            {attachment.name}
                          </span>
                          <button
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto"
                  >
                    <PaperclipIcon className="h-4 w-4 mr-2" />
                    Attach Files
                  </Button>
                  <Button onClick={handleSendMessage} className="w-full sm:w-auto" disabled={loading}>
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                </div>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleAttachFiles}
                />
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Messages;
