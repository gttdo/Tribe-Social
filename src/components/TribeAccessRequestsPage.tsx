import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ArrowLeft, Shield, Clock, CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { TribeAccessRequest, getUserAccessRequests, cancelAccessRequest } from '../utils/tribe-access-helpers';
import { toast } from 'sonner@2.0.3';
import { formatDistanceToNow } from 'date-fns';

interface TribeAccessRequestsPageProps {
  onBack: () => void;
}

export function TribeAccessRequestsPage({ onBack }: TribeAccessRequestsPageProps) {
  const [requests, setRequests] = useState<TribeAccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const userRequests = await getUserAccessRequests();
      setRequests(userRequests);
    } catch (error) {
      console.error('Error loading access requests:', error);
      toast.error('Failed to load access requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleCancelRequest = async (requestId: string) => {
    if (cancellingRequest) return;
    
    setCancellingRequest(requestId);
    
    try {
      const response = await cancelAccessRequest(requestId);
      
      if (response.success) {
        toast.success(response.message);
        // Remove the cancelled request from the list
        setRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error('Failed to cancel request');
    } finally {
      setCancellingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="border-green-500/30 text-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="outline" className="border-glitch-red/30 text-glitch-red">
            <XCircle className="w-3 h-3 mr-1" />
            Denied
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-muted-lavender/30 text-muted-lavender">
            {status}
          </Badge>
        );
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const completedRequests = requests.filter(req => req.status !== 'pending');

  return (
    <div className="min-h-screen bg-midnight-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 text-muted-lavender hover:text-pearl-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-headline text-pearl-white text-lg">
                Tribe Access Requests
              </h1>
              <p className="text-muted-lavender text-sm">
                Manage your pending requests
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRequests}
            disabled={isLoading}
            className="text-muted-lavender hover:text-pearl-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-neon-lilac mx-auto" />
              <p className="text-muted-lavender font-body">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted-lavender/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-muted-lavender/60" />
              </div>
              <div className="space-y-2">
                <h3 className="font-headline text-pearl-white">No Access Requests</h3>
                <p className="text-muted-lavender font-body text-sm max-w-xs mx-auto">
                  You haven't requested access to any private tribes yet.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-headline text-pearl-white text-md">
                  Pending Requests ({pendingRequests.length})
                </h2>
                
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="bg-midnight-black/80 border-muted-lavender/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={request.tribe?.avatar_url} />
                            <AvatarFallback className="bg-neon-lilac/20 text-neon-lilac">
                              {request.tribe?.name?.[0]?.toUpperCase() || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-body text-pearl-white font-medium truncate">
                                {request.tribe?.name || 'Unknown Tribe'}
                              </h3>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            <p className="text-muted-lavender/70 text-sm">
                              Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </p>
                            
                            {request.message && (
                              <div className="mt-2 p-2 bg-muted-lavender/5 rounded border border-muted-lavender/10">
                                <p className="text-muted-lavender text-sm">
                                  "{request.message}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={cancellingRequest === request.id}
                          className="text-glitch-red/70 hover:text-glitch-red hover:bg-glitch-red/10 ml-2"
                        >
                          {cancellingRequest === request.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Completed Requests */}
            {completedRequests.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-headline text-pearl-white text-md">
                  Past Requests ({completedRequests.length})
                </h2>
                
                {completedRequests.map((request) => (
                  <Card key={request.id} className="bg-midnight-black/60 border-muted-lavender/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 opacity-60">
                          <AvatarImage src={request.tribe?.avatar_url} />
                          <AvatarFallback className="bg-muted-lavender/10 text-muted-lavender/60">
                            {request.tribe?.name?.[0]?.toUpperCase() || 'T'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-body text-muted-lavender font-medium truncate">
                              {request.tribe?.name || 'Unknown Tribe'}
                            </h3>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <p className="text-muted-lavender/50 text-sm">
                            {request.status === 'approved' ? 'Approved' : 'Denied'} {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Info Alert */}
        <Alert className="bg-electric-blue/10 border-electric-blue/30">
          <Shield className="h-4 w-4 text-electric-blue" />
          <AlertDescription className="text-electric-blue/90 font-body text-sm">
            When you request access to a private tribe, the tribe administrators will be notified. 
            They can then approve or deny your request. You'll receive a notification once they make a decision.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}