      
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