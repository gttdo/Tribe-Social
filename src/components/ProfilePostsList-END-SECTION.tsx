  // Main component return
  return (
    <>
      {/* Posts List */}
      <div className="space-y-3">
        {posts.map((post) => renderPostListItem(post))}
      </div>

      {/* Load more posts */}
      {hasMore && (
        <div 
          ref={loadMoreRef}
          className="py-6 flex justify-center"
        >
          {loadingMore ? (
            <div className="space-y-3 w-full">
              {renderSkeletons(2)}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-lavender font-body text-sm">Scroll down to load more posts</p>
            </div>
          )}
        </div>
      )}

      {/* Post Detail Modals */}
      {/* Use EditablePostDetailsDrawer for own profile, regular PostDetailsDrawer for others */}
      {!isMobile && selectedPostId && showPostDetails && (
        isOwnProfile ? (
          <EditablePostDetailsDrawer
            postId={selectedPostId}
            isOpen={showPostDetails}
            onClose={handleClosePostDetails}
            onPostDeleted={handlePostDeletedFromModal}
            onPostUpdated={handlePostUpdated}
            isOwnProfile={isOwnProfile}
            userId={userId}
          />
        ) : (
          <PostDetailsDrawer
            postId={selectedPostId}
            isOpen={showPostDetails}
            onClose={handleClosePostDetails}
            onPostDeleted={handlePostDeletedFromModal}
            isOwnProfile={isOwnProfile}
            userId={userId}
          />
        )
      )}

      {/* Mobile Post Details Page */}
      {isMobile && selectedPostId && showPostDetailsPage && (
        <PostDetailsPage
          postId={selectedPostId}
          onBack={handleClosePostDetails}
          isOwnProfile={isOwnProfile}
          userId={userId}
          onPostDeleted={handlePostDeletedFromModal}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeletePost}
        isDeleting={isDeleting}
        itemType="post"
        itemTitle={postToDelete ? (postToDelete.caption || postToDelete.content || 'this post').substring(0, 50) + ((postToDelete.caption || postToDelete.content || '').length > 50 ? '...' : '') : 'this post'}
      />
    </>
  );
}