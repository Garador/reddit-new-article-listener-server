export interface IUserAddress {
    email: string
}

export interface IListener {
    eval_function: string,
    user: string
}

export interface IResultChildren {
    kind: string,
    data: IPostData
}

export interface IPostData {
    all_awardings: [],
    allow_live_comments: boolean,
    approved_at_utc: number|null
    approved_by: number|null
    archived: boolean
    author: string
    author_flair_background_color: string|null
    author_flair_css_class: string|null
    author_flair_richtext: []
    author_flair_template_id: string|null
    author_flair_text: string|null
    author_flair_text_color: string|null
    author_flair_type: string
    author_fullname: string
    author_patreon_flair: boolean
    author_premium: boolean
    awarders: []
    banned_at_utc: number|null
    banned_by: string|null
    can_gild: boolean
    can_mod_post: boolean
    category: null
    clicked: boolean
    content_categories: null
    contest_mode: boolean
    created: number
    created_utc: number
    discussion_type: null
    distinguished: null
    domain: string
    downs: number
    edited: boolean
    gilded: number
    gildings: any
    hidden: boolean
    hide_score: boolean
    id: string
    is_crosspostable: boolean
    is_meta: boolean
    is_original_content: boolean
    is_reddit_media_domain: boolean
    is_robot_indexable: boolean
    is_self: boolean
    is_video: boolean
    likes: number|null
    link_flair_background_color: string
    link_flair_css_class: string
    link_flair_richtext: []
    link_flair_template_id: string
    link_flair_text: string
    link_flair_text_color: string
    link_flair_type: string
    locked: boolean
    media: null
    media_embed: any
    media_metadata: any
    media_only: boolean
    mod_note: null
    mod_reason_by: null
    mod_reason_title: null
    mod_reports: []
    name: string
    no_follow: boolean
    num_comments: 1
    num_crossposts: 0
    num_reports: number|null
    over_18: boolean
    parent_whitelist_status: string
    permalink: string
    pinned: boolean
    pwls: 6
    quarantine: boolean
    removal_reason: null
    removed_by: null
    removed_by_category: null
    report_reasons: null
    saved: boolean
    score: 0
    secure_media: null
    secure_media_embed: {}
    selftext: string
    selftext_html: string
    send_replies: boolean
    spoiler: boolean
    steward_reports: []
    stickied: boolean
    subreddit: string
    subreddit_id: string
    subreddit_name_prefixed: string
    subreddit_subscribers: 154290
    subreddit_type: string
    suggested_sort: string
    thumbnail: string
    title: string
    total_awards_received: 0
    ups: 0
    url: string
    user_reports: []
    view_count: null
    visited: boolean
    whitelist_status: string
    wls: 6
}