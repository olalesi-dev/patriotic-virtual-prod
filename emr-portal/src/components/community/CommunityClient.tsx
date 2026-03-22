"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Heart, MessageCircle, Share2, Award, Flame, TrendingUp, Trophy, User, Plus, Camera, Home, Search, Bell, Flag, Image as ImageIcon, Video, Target, Activity as ActivityIcon, CheckCircle2, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import imageCompression from 'browser-image-compression';

const HEALTH_JOURNEY_TAGS = [
    'Weight Loss', 'GLP-1', 'Testosterone', 'Hair Growth', 'Mental Wellness', 'General Health'
];

interface CommunityProfile {
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    journeyTag?: string;
    streak: number;
    score: number;
}

interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorTag?: string;
    text: string;
    mediaUrl?: string;
    mediaType?: string;
    timestamp: any;
    likes: number;
    replies: number;
    hidden?: boolean;
}

export function CommunityClient({ role }: { role: 'patient' | 'provider' }) {
    const [profile, setProfile] = useState<CommunityProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [activeTab, setActiveTab] = useState<'feed' | 'challenges'>('feed');
    
    // Form state for profile creation
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [formName, setFormName] = useState('');
    const [formBio, setFormBio] = useState('');
    const [formTag, setFormTag] = useState(HEALTH_JOURNEY_TAGS[0]);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form state for new post
    const [newPostText, setNewPostText] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [postMedia, setPostMedia] = useState<File | null>(null);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const docRef = doc(db, 'community-profiles', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfile(docSnap.data() as CommunityProfile);
                } else {
                    setIsCreatingProfile(true);
                }

                // Subscribe to posts
                const q = query(collection(db, 'community-posts'), orderBy('timestamp', 'desc'));
                const unsubPosts = onSnapshot(q, (snapshot) => {
                    const loadedPosts = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Post[];
                    setPosts(loadedPosts);
                });

                setLoading(false);
                return () => unsubPosts();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser || !formName.trim()) return;

        setFormLoading(true);
        try {
            let avatarUrl = undefined;
            if (avatarFile) {
                const storageRef = ref(storage, `community-profiles/${auth.currentUser.uid}/${avatarFile.name}`);
                await uploadBytes(storageRef, avatarFile);
                avatarUrl = await getDownloadURL(storageRef);
            }

            const newProfile: CommunityProfile = {
                displayName: formName.trim(),
                bio: formBio.trim(),
                journeyTag: formTag,
                streak: 1,
                score: 10
            };
            if (avatarUrl) newProfile.avatarUrl = avatarUrl;

            await setDoc(doc(db, 'community-profiles', auth.currentUser.uid), newProfile);
            setProfile(newProfile);
            setIsCreatingProfile(false);
            toast.success("Community profile created!");
        } catch (error) {
            console.error("Profile creation error", error);
            toast.error("Failed to create profile. Please try again.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('video/')) {
            // max ~100MB
            if (file.size > 100 * 1024 * 1024) {
                toast.error("Video is too large (max 100MB)");
                return;
            }
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function() {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 60) {
                    toast.error("Video duration exceeds 60 seconds limit.");
                    return;
                }
                setPostMedia(file);
                setMediaPreviewUrl(URL.createObjectURL(file));
            };
            video.src = URL.createObjectURL(file);
        } else if (file.type.startsWith('image/')) {
            setPostMedia(file);
            setMediaPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleCreatePost = async () => {
        if (!auth.currentUser || !profile) return;
        if (!newPostText.trim() && !postMedia) return;
        
        setIsPosting(true);
        try {
            let mediaUrl = null;
            let mediaType = null;
            
            if (postMedia) {
                let fileToUpload = postMedia;
                if (fileToUpload.type.startsWith('image/')) {
                    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                    fileToUpload = await imageCompression(fileToUpload, options);
                }
                const storageRef = ref(storage, `community-media/${auth.currentUser.uid}/${Date.now()}_${fileToUpload.name}`);
                await uploadBytes(storageRef, fileToUpload);
                mediaUrl = await getDownloadURL(storageRef);
                mediaType = fileToUpload.type.split('/')[0];
            }

            const docData: any = {
                authorId: auth.currentUser.uid,
                authorName: profile.displayName,
                authorAvatar: profile.avatarUrl || null,
                authorTag: profile.journeyTag,
                text: newPostText.trim(),
                timestamp: serverTimestamp(),
                likes: 0,
                replies: 0,
                moderationStatus: 'pending',
                hidden: false
            };
            if (mediaUrl) {
                docData.mediaUrl = mediaUrl;
                docData.mediaType = mediaType;
            }

            const docRef = await addDoc(collection(db, 'community-posts'), docData);
            
            setNewPostText('');
            setPostMedia(null);
            setMediaPreviewUrl(null);
            
            // Trigger Moderation API async
            fetch('/api/v1/community/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: docRef.id,
                    collectionName: 'community-posts',
                    text: newPostText.trim(),
                    mediaUrl,
                    authorName: profile.displayName,
                    uid: auth.currentUser.uid
                })
            }).catch(e => console.error("Moderation trigger failed", e));
            
            toast.success("Posted successfully!");
        } catch (error) {
            toast.error("Failed to post message.");
        } finally {
            setIsPosting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-brand animate-spin rounded-full"></div>
            </div>
        );
    }

    if (isCreatingProfile) {
        return (
            <div className="max-w-xl mx-auto mt-10 p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Join the Community</h1>
                    <p className="text-slate-500 font-medium">Create your anonymous community profile. No clinical data is shared here.</p>
                </div>

                <form onSubmit={handleCreateProfile} className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center border border-teal-200 dark:border-teal-800 overflow-hidden relative group cursor-pointer hover:border-teal-400 transition-colors">
                            {avatarFile ? (
                                <img src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <User className="w-10 h-10 text-teal-400" />
                            )}
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optional Avatar</span>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Display Name</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="e.g. JourneyHero23" 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none transition-shadow"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Primary Journey</label>
                        <select 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none transition-shadow"
                            value={formTag}
                            onChange={(e) => setFormTag(e.target.value)}
                        >
                            {HEALTH_JOURNEY_TAGS.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Short Bio (Optional)</label>
                        <textarea 
                            rows={3}
                            placeholder="Tell the community a little about your journey..."
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none transition-shadow"
                            value={formBio}
                            onChange={(e) => setFormBio(e.target.value)}
                        />
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 flex gap-3 text-sm text-amber-800 dark:text-amber-400 font-medium">
                        <AlertCircleIcon className="w-5 h-5 shrink-0" />
                        <p>Remember: This is a public space. Do not share Protected Health Information (PHI) or personal details that could identify you.</p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={formLoading || !formName.trim()}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {formLoading ? 'Creating Profile...' : 'Join Community'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-20 lg:pb-8">
            {/* Sidebar (Desktop) / Top Nav (Mobile) */}
            <aside className="w-full lg:w-80 shrink-0 space-y-6">
                
                {/* Mobile/Tablet Tab Switcher */}
                <div className="lg:hidden flex bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 p-1 mb-2">
                    <button 
                        className={`flex-1 py-2 text-sm font-bold rounded-full transition-all ${activeTab === 'feed' ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        onClick={() => setActiveTab('feed')}
                    >
                        Community Feed
                    </button>
                    <button 
                        className={`flex-1 py-2 text-sm font-bold rounded-full transition-all ${activeTab === 'challenges' ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        onClick={() => setActiveTab('challenges')}
                    >
                        Challenges
                    </button>
                </div>

                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm shadow-slate-200/50 hidden lg:block">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-md overflow-hidden bg-slate-100 flex items-center justify-center mb-4 relative z-10 -mt-12">
                            {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 text-slate-400" />
                            )}
                        </div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">{profile?.displayName}</h2>
                        <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mt-2 mb-4 border border-teal-100 dark:border-teal-800">
                            {profile?.journeyTag}
                        </span>
                        {profile?.bio && (
                            <p className="text-sm text-slate-500 font-medium italic">"{profile.bio}"</p>
                        )}
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-700 mt-6 pt-6 flex justify-around">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-orange-500 font-black text-xl mb-1">
                                <Flame className="w-5 h-5 fill-orange-500" /> {profile?.streak || 0}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Day Streak</span>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-xl mb-1">
                                <Trophy className="w-5 h-5 fill-amber-500" /> {profile?.score || 0}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Points</span>
                        </div>
                    </div>
                </div>

                {/* Desktop Tab Links */}
                <div className="hidden lg:flex flex-col gap-2">
                    <button 
                        onClick={() => setActiveTab('feed')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'feed' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <MessageCircle className="w-5 h-5" /> Main Feed
                    </button>
                    <button 
                        onClick={() => setActiveTab('challenges')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'challenges' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <Target className="w-5 h-5" /> Challenges & Streaks
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 space-y-6">
                
                {activeTab === 'feed' ? (
                    <>
                        {/* Composer */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col gap-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
                                    {profile?.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                                <textarea 
                                    className="flex-1 bg-transparent border-none text-slate-800 dark:text-white text-lg font-medium placeholder:text-slate-400 resize-none focus:outline-none pt-2 custom-scrollbar"
                                    placeholder={"Share an update, insight, or question with the community..."}
                                    rows={2}
                                    value={newPostText}
                                    onChange={(e) => setNewPostText(e.target.value)}
                                />
                            </div>

                            {mediaPreviewUrl && (
                                <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 self-start">
                                    {postMedia?.type.startsWith('image/') ? (
                                        <img src={mediaPreviewUrl} className="max-h-64 object-contain" alt="Preview" />
                                    ) : (
                                        <video src={mediaPreviewUrl} className="max-h-64" controls />
                                    )}
                                    <button 
                                        onClick={() => { setPostMedia(null); setMediaPreviewUrl(null); }}
                                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                                    >×</button>
                                </div>
                            )}

                            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="file" 
                                        accept="image/*,video/*" 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={handleMediaSelect} 
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-500 transition-colors"
                                        title="Attach Photo/Video"
                                    >
                                        <Camera className="w-5 h-5" />
                                    </button>
                                </div>
                                <button 
                                    onClick={handleCreatePost}
                                    disabled={isPosting || (!newPostText.trim() && !postMedia)}
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <Plus className="w-4 h-4" /> Post
                                </button>
                            </div>
                        </div>

                        {/* Feed */}
                        <div className="space-y-6">
                            {posts.filter(p => !p.hidden).length === 0 ? (
                                <div className="text-center p-12 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
                                    No posts yet. Be the first to share!
                                </div>
                            ) : (
                                posts.filter(p => !p.hidden).map(post => (
                                    <PostCard key={post.id} post={post} currentUid={auth.currentUser?.uid || ''} profile={profile} />
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <ChallengesTab profile={profile} />
                )}
            </main>

            {/* Mobile Bottom Navigation could go here, but normally handled by layout */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe z-40 flex items-center justify-around p-3 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1 ${activeTab === 'feed' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Feed</span>
                </button>
                <button onClick={() => setActiveTab('challenges')} className={`flex flex-col items-center gap-1 ${activeTab === 'challenges' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                    <Target className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Challenges</span>
                </button>
                <div className="relative -mt-6">
                    <button 
                        onClick={() => { setActiveTab('feed'); window.scrollTo(0,0); }}
                        className="w-14 h-14 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30 active:scale-95 transition-transform border-4 border-[#F0F9FF] dark:border-slate-900"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
                <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <Bell className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Alerts</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                        {profile?.avatarUrl ? (
                            <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-full h-full p-1" />
                        )}
                    </div>
                    <span className="text-[10px] font-bold">Profile</span>
                </button>
            </nav>
        </div>
    );
}

function PostCard({ post, currentUid, profile }: { post: Post, currentUid: string, profile: CommunityProfile | null }) {
    const timeString = post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'Just now';
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [isFlagging, setIsFlagging] = useState(false);
    
    useEffect(() => {
        if (!showComments) return;
        const q = query(collection(db, 'community-posts', post.id, 'comments'), orderBy('timestamp', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [showComments, post.id]);

    const handleLike = async () => {
        if (isLiking || !currentUid) return;
        setIsLiking(true);
        try {
            await updateDoc(doc(db, 'community-posts', post.id), { likes: increment(1) });
        } catch (e) {
            toast.error("Failed to like post");
        } finally {
            setIsLiking(false);
        }
    };

    const handleComment = async () => {
        if (!newComment.trim() || !currentUid) return;
        try {
            const commentRef = await addDoc(collection(db, 'community-posts', post.id, 'comments'), {
                authorId: currentUid,
                authorName: profile?.displayName || 'Unknown',
                authorAvatar: profile?.avatarUrl || null,
                text: newComment.trim(),
                timestamp: serverTimestamp()
            });
            await updateDoc(doc(db, 'community-posts', post.id), { replies: increment(1) });
            setNewComment('');
            
            // Trigger Moderation
            fetch('/api/v1/community/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: commentRef.id,
                    collectionName: `community-posts/${post.id}/comments`,
                    text: newComment.trim(),
                    authorName: profile?.displayName || 'Unknown',
                    uid: currentUid
                })
            }).catch(e => console.error("Moderation trigger failed", e));
            
        } catch (e) {
            toast.error("Failed to post comment");
        }
    };

    const handleFlag = async () => {
        if (isFlagging) return;
        setIsFlagging(true);
        try {
            await fetch('/api/v1/community/flag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: post.id,
                    collectionName: 'community-posts',
                    text: post.text,
                    mediaUrl: post.mediaUrl,
                    authorName: post.authorName,
                    authorId: post.authorId,
                    flaggerId: currentUid
                })
            });
            toast.success("Post flagged for moderation review");
        } catch (e) {
            toast.error("Failed to flag post");
        } finally {
            // we leave isFlagging true intentionally so it can't be spammed
        }
    };

    const toggleFullscreen = (e: React.MouseEvent<HTMLVideoElement>) => {
        const elem = e.currentTarget as any;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
    };
    
    return (
        <article className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        {post.authorAvatar ? (
                            <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-slate-400" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white">{post.authorName}</h4>
                            {post.authorTag && (
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 hidden sm:inline-block">
                                    {post.authorTag}
                                </span>
                            )}
                        </div>
                        <time className="text-xs font-medium text-slate-400">{timeString}</time>
                    </div>
                </div>
                <button 
                    onClick={handleFlag}
                    className={`p-2 rounded-xl transition-colors ${isFlagging ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    title="Flag post"
                >
                    <Flag className="w-4 h-4" />
                </button>
            </div>
            
            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-4 whitespace-pre-wrap">
                {post.text}
            </p>

            {post.mediaUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex justify-center max-h-96">
                    {post.mediaType === 'image' ? (
                        <img src={post.mediaUrl} alt="Post attached media" className="max-w-full max-h-96 object-contain" />
                    ) : (
                        <video 
                            src={post.mediaUrl} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            onClick={toggleFullscreen}
                            className="max-w-full max-h-96 object-contain cursor-pointer" 
                        />
                    )}
                </div>
            )}
            
            <div className={`flex items-center gap-6 border-t border-slate-100 dark:border-slate-700 pt-4 ${showComments ? 'border-b pb-4 mb-4' : ''}`}>
                <button onClick={handleLike} className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors group">
                    <Heart className="w-5 h-5 group-hover:fill-amber-500 group-active:scale-125 transition-transform" />
                    <span className="text-sm font-bold">{post.likes || 0}</span>
                </button>
                <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 transition-colors ${showComments ? 'text-teal-500' : 'text-slate-400 hover:text-teal-500'}`}>
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-bold">{post.replies || 0}</span>
                </button>
            </div>

            {showComments && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex gap-3 mt-4">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0">
                            {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Me" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-full h-full p-1.5 text-slate-400" />
                            )}
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Add a comment..."
                                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleComment()}
                            />
                            <button 
                                onClick={handleComment}
                                disabled={!newComment.trim()}
                                className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                                Reply
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pl-11 pt-2">
                        {comments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No comments yet.</p>
                        ) : comments.filter(c => !c.hidden).map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 mt-1">
                                    {comment.authorAvatar ? (
                                        <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-full h-full p-1 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl rounded-tl-sm">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-bold text-slate-900 dark:text-white text-sm">{comment.authorName}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {comment.timestamp?.toDate ? formatDistanceToNow(comment.timestamp.toDate()) : 'Now'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
}

function ChallengesTab({ profile }: { profile: CommunityProfile | null }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] p-8 text-white shadow-lg shadow-orange-500/20">
                <div className="flex items-center gap-3 mb-4">
                    <Flame className="w-8 h-8 text-amber-100" />
                    <h2 className="text-2xl font-black tracking-tight">Your Activity Streak</h2>
                </div>
                <div className="flex items-end gap-2 text-white">
                    <span className="text-6xl font-black tracking-tighter leading-none">{profile?.streak || 0}</span>
                    <span className="text-xl font-bold text-amber-100 mb-1">Days</span>
                </div>
                <p className="font-medium text-amber-100 mt-4 leading-relaxed max-w-md">
                    Log in and engage with the community daily to build your active streak. Consistent engagement leads to better outcomes!
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
                            <ActivityIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white text-lg">Weekly Leaderboard</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Top Engagers</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Mock Leaderboard since it's activity-based only, strictly non-clinical */}
                        {[
                            { name: 'Sarah J.', points: 450, tag: 'Weight Loss' },
                            { name: 'Marcus T.', points: 380, tag: 'TRT' },
                            { name: (profile?.displayName || 'You'), points: (profile?.score || 10), me: true },
                            { name: 'Elena R.', points: 310, tag: 'Mental Wellness' }
                        ].sort((a,b) => b.points - a.points).map((user, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-2xl ${user.me ? 'bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-slate-400 w-6 text-center">#{i+1}</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                        <User className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <span className={`font-bold text-sm ${user.me ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {user.name}
                                    </span>
                                </div>
                                <span className={`font-black text-sm ${user.me ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-white'}`}>
                                    {user.points} pts
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white text-lg">Milestone Badges</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Achievements</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex flex-col items-center text-center">
                            <Trophy className="w-8 h-8 text-emerald-500 mb-2" />
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">First Post</h4>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full mt-2">Earned!</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center opacity-60 grayscale hover:grayscale-0 transition-all cursor-pointer">
                            <Flame className="w-8 h-8 text-orange-500 mb-2" />
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">7 Day Streak</h4>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full mt-2">Locked</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center opacity-60 grayscale hover:grayscale-0 transition-all cursor-pointer">
                            <Target className="w-8 h-8 text-indigo-500 mb-2" />
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Top Motivator</h4>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full mt-2">Locked</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AlertCircleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
