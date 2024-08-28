import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  Renderer2,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, take, takeUntil } from 'rxjs';
import { OutGoingCallModalComponent } from 'src/app/@shared/modals/outgoing-call-modal/outgoing-call-modal.component';
import { EncryptDecryptService } from 'src/app/@shared/services/encrypt-decrypt.service';
import { MessageService } from 'src/app/@shared/services/message.service';
import { PostService } from 'src/app/@shared/services/post.service';
import { SharedService } from 'src/app/@shared/services/shared.service';
import { SocketService } from 'src/app/@shared/services/socket.service';
import { ToastService } from 'src/app/@shared/services/toast.service';
import { Howl } from 'howler';
import { CreateGroupModalComponent } from 'src/app/@shared/modals/create-group-modal/create-group-modal.component';
import { EditGroupModalComponent } from 'src/app/@shared/modals/edit-group-modal/edit-group-modal.component';
import { MessageDatePipe } from 'src/app/@shared/pipe/message-date.pipe';
import { MediaGalleryComponent } from 'src/app/@shared/components/media-gallery/media-gallery.component';
import { EmojiPaths } from 'src/app/@shared/constant/emoji';
import { CustomerService } from 'src/app/@shared/services/customer.service';
import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { SeoService } from 'src/app/@shared/services/seo.service';
import { ForwardChatModalComponent } from 'src/app/@shared/modals/forward-chat-modal/forward-chat-modal.component';
import { v4 as uuid } from 'uuid';
import {
  FILE_EXTENSIONS,
  FILE_EXTENSIONS_Video,
} from 'src/app/@shared/constant/file-extensions';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-profile-chats-list',
  templateUrl: './profile-chats-list.component.html',
  styleUrls: ['./profile-chats-list.component.scss'],
})
// changeDetection: ChangeDetectionStrategy.OnPush,
export class ProfileChatsListComponent
  implements OnInit, OnChanges, AfterViewChecked, OnDestroy, AfterViewInit
{
  @Input('userChat') userChat: any = {};
  @Input('sidebarClass') sidebarClass: boolean = false;
  @Output('newRoomCreated') newRoomCreated: EventEmitter<any> =
    new EventEmitter<any>();
  @Output('selectedChat') selectedChat: EventEmitter<any> =
    new EventEmitter<any>();
  @ViewChild('chatContent') chatContent!: ElementRef;

  webUrl = environment.webUrl;
  profileId: number;
  chatObj = {
    msgText: null,
    msgMedia: null,
    id: null,
    parentMessageId: null,
  };
  replyMessage = {
    msgText: null,
    msgMedia: null,
    createdDate: null,
    userName: null,
  };
  isFileUploadInProgress: boolean = false;
  progressValue = 0;
  selectedFile: any;

  groupData: any = {};
  messageList: any = [];
  filteredMessageList: any = [];
  readMessagesBy: any = [];
  readMessageRoom: string = '';
  metaURL: any = [];
  metaData: any = {};
  ngUnsubscribe: Subject<void> = new Subject<void>();
  cancelUpload$ = new Subject<void>();
  isMetaLoader: boolean = false;
  pdfName: string = '';
  viewUrl: string;
  pdfmsg: string;
  userId: number;
  messageInputValue: string = '';
  firstTimeScroll = false;
  activePage = 1;
  hasMoreData = false;
  typingData: any = {};
  isTyping = false;
  typingTimeout: any;
  emojiPaths = EmojiPaths;
  originalFavicon: HTMLLinkElement;
  isGallerySidebarOpen: boolean = false;
  qrLink = '';
  authToken: string;
  userStatus: string;
  isOnline = false;
  isSearch = false;
  searchQuery = '';
  currentUser: any = [];
  currentIndex: number = -1;
  currentHighlightedIndex: number = -1;
  uploadTo = {
    groupId: null,
    roomId: null,
  };
  isOnCall = false;
  callRoomId: number;
  isLoading: boolean = false;
  // messageList: any = [];
  @ViewChildren('message') messageElements: QueryList<ElementRef>;
  constructor(
    private socketService: SocketService,
    public sharedService: SharedService,
    private messageService: MessageService,
    private postService: PostService,
    private toastService: ToastService,
    private spinner: NgxSpinnerService,
    public encryptDecryptService: EncryptDecryptService,
    private modalService: NgbModal,
    private offcanvasService: NgbOffcanvas,
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private seoService: SeoService,
    private renderer: Renderer2,
    private router: Router
  ) {
    this.userId = +this.route.snapshot.paramMap.get('id');
    this.profileId = +localStorage.getItem('profileId');
    this.callRoomId = +localStorage.getItem('callRoomId');
    // const authToken = localStorage.getItem('auth-token')
    // this.qrLink = `${environment.qrLink}${this.profileId}?token=${authToken}`;

    const data = {
      title: 'Skin.toys-Chat',
      url: `${location.href}`,
      description: '',
    };
    this.seoService.updateSeoMetaData(data);
    this.isOnCall = this.router.url.includes('/dating-call/') || false;
  }
  ngAfterViewInit(): void {
    if (this.callRoomId) {
      localStorage.removeItem('callRoomId');
      this.callRoomId = null;
    }
  }

  ngOnInit(): void {
    if (this.userChat?.roomId || this.userChat?.groupId) {
      this.messageList = [];
      this.filteredMessageList = [];
      this.getMessageList();
    }
    this.socketService.socket?.on('new-message', (data) => {
      this.newRoomCreated.emit(true);
      this.selectedChat.emit(data?.roomId || data?.groupId);
      if (
        (this.userChat?.roomId === data?.roomId ||
          this.userChat?.groupId === data?.groupId) &&
        data?.sentBy !== this.profileId
      ) {
        let index = this.messageList?.findIndex((obj) => obj?.id === data?.id);
        if (data?.isDeleted) {
          this.messageList = this.messageList.filter(
            (obj) => obj?.id !== data?.id && obj?.parentMessageId !== data.id
          );
          this.filteredMessageList?.forEach((ele: any) => {
            ele.messages = ele.messages.filter(
              (obj: any) =>
                obj.id !== data.id && obj.parentMessageId !== data.id
            );
          });
        } else if (this.messageList[index]) {
          if (data?.parentMessage) {
            data.parentMessage.messageText =
              this.encryptDecryptService?.decryptUsingAES256(
                data?.parentMessage?.messageText
              );
          }
          data.messageText = this.encryptDecryptService?.decryptUsingAES256(
            data?.messageText
          );
          this.messageList[index] = data;
          this.filteredMessageList?.forEach((ele: any) => {
            const indext = ele.messages?.findIndex(
              (obj) => obj?.id === data?.id
            );
            if (ele.messages[indext]) {
              ele.messages[indext] = data;
            }
          });
        } else {
          if (data?.parentMessage) {
            data.parentMessage.messageText =
              this.encryptDecryptService?.decryptUsingAES256(
                data?.parentMessage?.messageText
              );
          }
          if (data?.messageText) {
            data.messageText = this.encryptDecryptService?.decryptUsingAES256(
              data?.messageText
            );
          }
          this.scrollToBottom();
          if (data !== null) {
            // this.messageList.push(data);
            const url = data?.messageText || null;
            const text = url?.replace(/<br\s*\/?>|<[^>]*>/g, ' ');
            const matches = text?.match(
              /(?:https?:\/\/|www\.)[^\s<]+(?:\s|<br\s*\/?>|$)/
            );

            if (matches?.[0]) {
              this.getMetaDataFromUrlStr(matches?.[0]).then((metaData) => {
                data['metaData'] = metaData;
                this.messageList.push(data);
              });
            } else {
              this.messageList.push(data);
            }
          }
          const lastIndex = this.filteredMessageList.length - 1;
          if (this.filteredMessageList[lastIndex]) {
            this.filteredMessageList[lastIndex]?.messages.push(data);
          } else {
            this.filteredMessageList.push({ messages: [data] });
          }
          if (this.userChat.groupId === data?.groupId) {
            if (this.userChat?.groupId) {
              const date = moment(new Date()).utc();
              const oldChat = {
                profileId: this.profileId,
                groupId: data?.groupId,
                date: moment(date).format('YYYY-MM-DD HH:mm:ss'),
              };
              this.socketService.switchChat(oldChat, (data) => {
                console.log(data);
              });
            }
            this.socketService.readGroupMessage(data, (readUsers) => {
              this.readMessagesBy = readUsers.filter(
                (item) => item.ID !== this.profileId
              );
            });
          }
        }
        if (this.userChat.roomId === data?.roomId) {
          const readData = {
            ids: [data.id],
            profileId: data.sentBy,
          };
          this.socketService.readMessage(readData, (res) => {
            if (res && this.sharedService.isNotify) {
              this.originalFavicon['href'] = '/assets/images/icon.jpg';
              this.sharedService.isNotify = false;
            }
            // console.log(res);
            return;
          });
        }
      }
    });
    this.socketService.socket.on('seen-room-message', (data) => {
      this.readMessageRoom = 'Y';
    });

    this.socketService.socket?.on('get-users', (data) => {
      const index = data.findIndex((ele) => {
        return ele.userId === this.profileId;
      });
      if (!this.sharedService.onlineUserList[index]) {
        data.map((ele) => {
          this.sharedService.onlineUserList.push({
            userId: ele.userId,
            status: ele.status,
          });
        });
      }
      // console.log(this.sharedService.onlineUserList);
    });
    this.socketService.socket?.emit('online-users');
    this.socketService.socket?.on('typing', (data) => {
      // console.log('typingData', data)
      this.typingData = data;
    });
    if (this.userChat.groupId) {
      this.socketService.socket.on('read-message-user', (data) => {
        this.readMessagesBy = data?.filter(
          (item) => item.ID !== this.profileId
        );
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.originalFavicon = document.querySelector('link[rel="icon"]');
    if (this.userChat?.groupId) {
      this.activePage = 1;
      this.messageList = [];
      this.filteredMessageList = [];
      this.hasMoreData = false;
      this.getGroupDetails(this.userChat.groupId);
      this.resetData();
    } else {
      this.groupData = null;
    }
    if (this.userChat?.roomId || this.userChat?.groupId) {
      this.notificationNavigation();
      this.activePage = 1;
      this.messageList = [];
      this.filteredMessageList = [];
      this.resetData();
      this.getMessageList();
      this.hasMoreData = false;
      this.socketService.socket?.on('get-users', (data) => {
        const index = data.findIndex((ele) => {
          return ele.userId === this.profileId;
        });
        if (!this.sharedService.onlineUserList[index]) {
          data.map((ele) => {
            this.sharedService.onlineUserList.push({
              userId: ele.userId,
              status: ele.status,
            });
          });
        }
        // console.log(this.sharedService.onlineUserList);
      });
      this.findUserStatus(this.userChat.profileId);
    }
    this.messageElements.changes.subscribe(() => {
      this.resetIndex();
    });
  }

  // scroller down
  ngAfterViewChecked() {}

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.cancelUpload$.next();
    this.cancelUpload$.complete();
  }

  createChatRoom(): void {
    this.socketService.createChatRoom(
      {
        profileId1: this.profileId,
        profileId2: this.userChat?.Id || this.userChat?.profileId,
      },
      (data: any) => {
        // console.log(data);
        this.userChat = { ...data?.room };
        this.newRoomCreated.emit(true);
      }
    );
  }

  // accept btn
  acceptRoom(): void {
    this.socketService?.acceptRoom(
      {
        roomId: this.userChat?.roomId,
        profileId: this.profileId,
      },
      (data: any) => {
        this.userChat.isAccepted = data.isAccepted;
        this.newRoomCreated.emit(true);
      }
    );
  }
  prepareMessage(text: string): string | null {
    const regexFontStart = /<font\s+[^>]*?>/gi;
    const regexFontEnd = /<\/font\s*?>/gi;
    let cleanedText = text
      .replace(regexFontStart, '<font>')
      .replace(regexFontEnd, '</font>');
    const regex =
      /<img\s+[^>]*src="data:image\/.*?;base64,[^\s]*"[^>]*>|<img\s+[^>]*src=""[^>]*>/g;
    cleanedText = cleanedText.replace(regex, '');
    const divregex = /<div\s*>\s*<\/div>/g;
    if (cleanedText.replace(divregex, '').trim() === '') return null;
    return this.encryptDecryptService?.encryptUsingAES256(cleanedText) || null;
  }

  // prepareMessage(text: string): string | null {
  //   const regex =
  //     /<img\s+[^>]*src="data:image\/.*?;base64,[^\s]*"[^>]*>|<img\s+[^>]*src=""[^>]*>/g;
  //   let cleanedText = text.replace(regex, '');
  //   const divregex = /<div\s*>\s*<\/div>/g;
  //   if (cleanedText.replace(divregex, '').trim() === '') return null;
  //   return this.encryptDecryptService?.encryptUsingAES256(cleanedText);
  // }

  // send btn
  sendMessage(): void {
    if (this.chatObj.id) {
      // const message =
      //   this.chatObj.msgText !== null
      //     ? this.encryptDecryptService?.encryptUsingAES256(this.chatObj.msgText)
      //     : null;
      const message =
        this.chatObj.msgText !== null
          ? this.prepareMessage(this.chatObj.msgText)
          : null;
      const data = {
        id: this.chatObj.id,
        messageText: message,
        roomId: this.userChat?.roomId,
        groupId: this.userChat?.groupId,
        sentBy: this.profileId,
        messageMedia: this.chatObj?.msgMedia,
        profileId: this.userChat.profileId,
        parentMessageId: this.chatObj.parentMessageId || null,
      };
      this.socketService?.editMessage(data, (editMsg: any) => {
        this.isFileUploadInProgress = false;
        if (editMsg) {
          let index = this.messageList?.findIndex(
            (obj) => obj?.id === editMsg?.id
          );
          if (this.messageList[index]) {
            this.messageList[index] = editMsg;
            editMsg.messageText = this.encryptDecryptService.decryptUsingAES256(
              editMsg?.messageText
            );
            if (editMsg?.parentMessage?.messageText) {
              editMsg.parentMessage.messageText =
                this.encryptDecryptService?.decryptUsingAES256(
                  editMsg?.parentMessage?.messageText
                );
            }
            this.filteredMessageList?.forEach((ele: any) => {
              const indext = ele.messages?.findIndex(
                (obj) => obj?.id === editMsg?.id
              );
              if (ele.messages[indext]) {
                ele.messages[indext] = editMsg;
              }
            });
            this.resetData();
          }
        }
        this.resetData();
      });
    } else {
      // const message =
      //   this.chatObj.msgText !== null
      //     ? this.encryptDecryptService?.encryptUsingAES256(this.chatObj.msgText)
      //     : null;
      const message =
        this.chatObj.msgText !== null
          ? this.prepareMessage(this.chatObj.msgText)
          : null;
      const data = {
        messageText: message,
        roomId: this.uploadTo.roomId ?? (this.uploadTo.groupId ? null : this.userChat?.roomId) ?? null,
        groupId: this.uploadTo.groupId ?? (this.uploadTo.roomId ? null : this.userChat?.groupId) ?? null,
        sentBy: this.profileId,
        messageMedia: this.chatObj?.msgMedia,
        profileId: this.userChat.profileId,
        parentMessageId: this.chatObj?.parentMessageId || null,
      };
      this.userChat?.roomId ? (data['isRead'] = 'N') : null;

      this.socketService.sendMessage(data, async (data: any) => {
        this.isFileUploadInProgress = false;
        this.scrollToBottom();
        this.newRoomCreated?.emit(true);

        if (this.filteredMessageList.length > 0) {
          data.messageText =
            data.messageText != null
              ? this.encryptDecryptService?.decryptUsingAES256(data.messageText)
              : null;
          if (data.parentMessage?.messageText) {
            data.parentMessage.messageText =
              this.encryptDecryptService?.decryptUsingAES256(
                data.parentMessage?.messageText
              );
          }
          const text = data.messageText?.replace(/<br\s*\/?>|<[^>]*>/g, ' ');
          const matches = text?.match(
            /(?:https?:\/\/|www\.)[^\s<]+(?:\s|<br\s*\/?>|$)/
          );
          if (matches?.[0]) {
            data['metaData'] = await this.getMetaDataFromUrlStr(matches?.[0]);
            this.scrollToBottom();
          }
        }
        this.messageList.push(data);
        this.readMessageRoom = data?.isRead;
        if (this.userChat.groupId === data.groupId) {
          this.readMessagesBy = [];
          this.socketService.readGroupMessage(data, (readUsers) => {
            this.readMessagesBy = readUsers.filter(
              (item) => item.ID !== this.profileId
            );
          });
        }
        if (this.filteredMessageList.length > 0) {
          const lastIndex = this.filteredMessageList.length - 1;
          if (
            this.filteredMessageList[lastIndex] &&
            !this.uploadTo.roomId &&
            !this.uploadTo.groupId
          ) {
            this.filteredMessageList[lastIndex]?.['messages'].push(data);
          }
        } else {
          const array = new MessageDatePipe(
            this.encryptDecryptService
          ).transform([data]);
          this.filteredMessageList = array;
        }
        this.resetData();
      });
    }
    this.startTypingChat(false);
  }

  loadMoreChats() {
    this.activePage = this.activePage + 1;
    this.getMessageList();
  }

  // getMessages
  getMessageList(): void {
    const tagUserInput = document.querySelector(
      'app-tag-user-input .tag-input-div'
    ) as HTMLInputElement;
    if (tagUserInput) {
      tagUserInput.focus();
    }
    this.getMessagesBySocket();
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatContent) {
        this.chatContent.nativeElement.scrollTop =
          this.chatContent.nativeElement.scrollHeight;
      }
    });
  }

  onPostFileSelect(event: any): void {
    const file = event.target?.files?.[0] || {};
    if (file.type.includes('application/')) {
      this.selectedFile = file;
      this.pdfName = file?.name;
      this.chatObj.msgText = null;
      this.viewUrl = URL.createObjectURL(file);
    } else if (file.type.includes('video/')) {
      this.selectedFile = file;
      this.viewUrl = URL.createObjectURL(file);
    } else if (file.type.includes('image/')) {
      this.selectedFile = file;
      this.viewUrl = URL.createObjectURL(file);
    }
    document.addEventListener('keyup', this.onKeyUp);
  }

  onKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      this.uploadPostFileAndCreatePost();
    }
  };

  removePostSelectedFile(): void {
    this.selectedFile = null;
    this.pdfName = null;
    this.viewUrl = null;
    this.resetData();
    if (this.isFileUploadInProgress) {
      this.cancelUpload$.next();
      this.isFileUploadInProgress = false;
    }
  }

  removeReplay(): void {
    this.replyMessage.msgText = null;
    this.replyMessage.msgMedia = null;
    this.replyMessage.userName = null;
    this.replyMessage.createdDate = null;
    this.chatObj.parentMessageId = null;
  }

  onTagUserInputChangeEvent(data: any): void {
    this.chatObj.msgText = this.extractImageUrlFromContent(
      data?.html.replace(/<div>\s*<br\s*\/?>\s*<\/div>\s*$/, '')
    );
    if (data.html === '') {
      this.resetData();
    }
  }

  uploadPostFileAndCreatePost(): void {
    if (!this.isFileUploadInProgress) {
      if (this.chatObj.msgText || this.selectedFile.name) {
        if (this.selectedFile) {
          this.isFileUploadInProgress = true;
          const param = {
            roomId: this.userChat?.roomId,
            groupId: this.userChat?.groupId,
          };
          this.scrollToBottom();
          this.postService
            .uploadFile(this.selectedFile, param)
            .pipe(takeUntil(this.cancelUpload$))
            .subscribe({
              next: (event) => {
                if (event.type === HttpEventType.UploadProgress) {
                  let streamnameProgress = Math.round(
                    (100 * event.loaded) / event.total
                  );
                  this.progressValue = streamnameProgress;
                  this.cdr.markForCheck();
                } else if (event.type === HttpEventType.Response) {
                  if (event?.body?.roomId !== this.userChat?.roomId) {
                    this.uploadTo.roomId = event.body.roomId;
                  } else if (event?.body?.groupId !== this.userChat?.groupId) {
                    this.uploadTo.groupId = event.body.groupId;
                  }
                  this.isFileUploadInProgress = false;
                  this.chatObj.msgMedia = event?.body?.url;
                  this.sendMessage();
                }
              },
              error: (err) => {
                this.isFileUploadInProgress = false;
                console.log(err);
              },
            });
        } else {
          this.isFileUploadInProgress = true;
          this.sendMessage();
        }
      } else {
        this.isFileUploadInProgress = true;
        this.sendMessage();
      }
    }
  }

  resetData(): void {
    document.removeEventListener('keyup', this.onKeyUp);
    this.progressValue = 0;
    this.chatObj['id'] = null;
    this.chatObj.parentMessageId = null;
    this.replyMessage.msgText = null;
    this.replyMessage.userName = null;
    this.replyMessage.createdDate = null;
    this.chatObj.msgMedia = null;
    this.chatObj.msgText = null;
    this.viewUrl = null;
    this.pdfName = null;
    this.selectedFile = null;
    this.messageInputValue = '';
    this.searchQuery = '';
    this.isSearch = false;
    this.uploadTo.roomId = null;
    this.uploadTo.groupId = null;
    if (this.messageInputValue !== null) {
      setTimeout(() => {
        this.messageInputValue = null;
      }, 10);
    }
  }

  displayLocalTime(utcDateTime: string): string {
    const localTime = moment.utc(utcDateTime).local();
    return localTime.format('h:mm A');
  }

  isPdf(media: string): boolean {
    if (!media) {
      return false;
    }
    this.pdfmsg = media?.split('/')[3]?.replaceAll('%', '-');
    const fileType = FILE_EXTENSIONS.some((ext) => media.endsWith(ext));
    return fileType;
  }

  pdfView(pdfUrl) {
    window.open(pdfUrl);
    this.toastService.success('Download successfully initiated.');
  }

  isFileOrVideo(media: any): boolean {
    return this.isFile(media) || this.isVideoFile(media);
  }

  isFile(media: string): boolean {
    const File = FILE_EXTENSIONS;
    return File.some((ext) => media?.endsWith(ext));
  }

  isVideoFile(media: string): boolean {
    const FILE_EXTENSIONS = FILE_EXTENSIONS_Video;
    return FILE_EXTENSIONS.some((ext) => media?.endsWith(ext));
  }

  onCancel(): void {
    if (this.userChat.roomId) {
      const data = {
        roomId: this.userChat?.roomId,
        createdBy: this.userChat.createdBy,
        profileId: this.profileId,
      };
      this.socketService?.deleteRoom(data, (data: any) => {
        this.userChat = {};
        this.newRoomCreated.emit(true);
      });
    } else {
      this.userChat = {};
    }
  }

  isGif(src: string): boolean {
    return src.toLowerCase().endsWith('.gif');
  }

  selectEmoji(emoji: any): void {
    this.chatObj.msgMedia = emoji;
  }

  replyMsg(msgObj): void {
    const tagUserInput = document.querySelector(
      'app-tag-user-input .tag-input-div'
    ) as HTMLInputElement;
    if (tagUserInput) {
      tagUserInput.focus();
    }
    this.chatObj.parentMessageId = msgObj?.id;
    this.replyMessage.msgText = msgObj.messageText;
    this.replyMessage.createdDate = msgObj?.createdDate;
    this.replyMessage.userName = msgObj.userName;

    if (!msgObj.messageText) {
      if (this.isFile(msgObj.messageMedia)) {
        this.pdfName = msgObj.messageMedia;
      } else if (this.isVideoFile(msgObj.messageMedia)) {
        this.pdfName = msgObj.messageMedia;
      } else {
        this.viewUrl = msgObj.messageMedia;
      }
    }
  }

  forwardMsg(msgObj): void {
    const modalRef = this.modalService.open(ForwardChatModalComponent, {
      centered: true,
      size: 'md',
    });
    modalRef.componentInstance.data = msgObj;
    modalRef.result.then((res) => {
      if (res === 'success') {
        this.filteredMessageList = [];
        this.getMessageList();
      }
    });
  }

  editMsg(msgObj): void {
    this.chatObj['id'] = msgObj?.id;
    this.messageInputValue = msgObj.messageText;
    this.chatObj.msgMedia = msgObj.messageMedia;
    this.chatObj.parentMessageId = msgObj?.parentMessageId || null;
    const tagUserInput = document.querySelector(
      'app-tag-user-input .tag-input-div'
    ) as HTMLInputElement;
    if (tagUserInput) {
      setTimeout(() => {
        this.focusCursorToEnd(tagUserInput);
        tagUserInput.scrollTop = tagUserInput.scrollHeight;
      }, 100);
    }
  }

  focusCursorToEnd(tagUserInput) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(tagUserInput);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    tagUserInput.focus();
  }

  deleteMsg(msg, date): void {
    this.socketService?.deleteMessage(
      {
        groupId: msg?.groupId,
        roomId: msg?.roomId,
        sentBy: msg.sentBy,
        id: msg.id,
        profileId: this.userChat?.profileId,
      },
      (data: any) => {
        if (data) {
          this.newRoomCreated.emit(true);
          this.messageList = this.messageList.filter(
            (obj) => obj?.id !== data?.id && obj?.parentMessageId !== data.id
          );
          if (this.filteredMessageList.length > 0) {
            this.filteredMessageList?.forEach((ele: any) => {
              if (ele.date === date) {
                ele.messages = ele.messages.filter(
                  (obj: any) =>
                    obj.id !== data.id && obj.parentMessageId !== data.id
                );
              }
            });
          }
        }
      }
    );
  }

  // getMetaDataFromUrlStr(url: string): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     if (url !== this.metaData?.url) {
  //       this.isMetaLoader = true;
  //       this.ngUnsubscribe.next();
  //       const unsubscribe$ = new Subject<void>();

  //       this.postService
  //         .getMetaData({ url })
  //         .pipe(takeUntil(unsubscribe$))
  //         .subscribe({
  //           next: (res: any) => {
  //             this.isMetaLoader = false;
  //             if (res?.meta?.image) {
  //               const urls = res.meta?.image?.url;
  //               const imgUrl = Array.isArray(urls) ? urls?.[0] : urls;

  //               const metatitles = res?.meta?.title;
  //               const metatitle = Array.isArray(metatitles)
  //                 ? metatitles?.[0]
  //                 : metatitles;

  //               const metaursl = Array.isArray(url) ? url?.[0] : url;
  //               this.metaData = {
  //                 title: metatitle,
  //                 metadescription: res?.meta?.description,
  //                 metaimage: imgUrl,
  //                 metalink: metaursl,
  //                 url: url,
  //               };
  //               resolve(this.metaData);
  //             } else {
  //               const metatitles = res?.meta?.title;
  //               const metatitle = Array.isArray(metatitles)
  //                 ? metatitles?.[0]
  //                 : metatitles;
  //               const metaursl = Array.isArray(url) ? url?.[0] : url;
  //               const metaLinkData = {
  //                 title: metatitle,
  //                 metadescription: res?.meta?.description,
  //                 metalink: metaursl,
  //                 url: url,
  //               };
  //               resolve(metaLinkData);
  //             }
  //           },
  //           error: (err) => {
  //             this.metaData.metalink = url;
  //             this.isMetaLoader = false;
  //             this.spinner.hide();
  //             reject(err);
  //           },
  //           complete: () => {
  //             unsubscribe$.next();
  //             unsubscribe$.complete();
  //           },
  //         });
  //     } else {
  //       resolve(this.metaData);
  //     }
  //   });
  // }

  getMetaDataFromUrlStr(url: string): Promise<any> {
    // return new Promise((resolve, reject) => {
    // if (url === this.metaData?.url) {
    //   resolve(this.metaData);
    //   return;
    // }
    return new Promise((resolve) => {
      if (url === this.metaData?.url) {
        resolve(this.metaData);
        return;
      }
      this.isMetaLoader = true;
      this.ngUnsubscribe.next();
      const unsubscribe$ = new Subject<void>();
      this.postService
        .getMetaData({ url })
        .pipe(takeUntil(unsubscribe$))
        .subscribe({
          next: (res: any) => {
            this.isMetaLoader = false;
            const meta = res.meta || {};
            const imageUrl = Array.isArray(meta.image?.url)
              ? meta.image.url[0]
              : meta.image?.url;
            const metaTitle = Array.isArray(meta.title)
              ? meta.title[0]
              : meta.title;
            const metaDescription =
              meta.description === 'undefined'
                ? 'Post content'
                : meta.description;

            const metaData = {
              title: metaTitle,
              metadescription:
                metaDescription === 'undefined'
                  ? 'Post content'
                  : metaDescription,
              metaimage: imageUrl,
              metalink: url,
              url: url,
            };
            this.metaData = metaData;
            resolve(metaData);
          },
          error: (err) => {
            this.isMetaLoader = false;
            // reject(err);
            const metaUrl = {
              metalink: url,
              url: url,
            };
            resolve(metaUrl);
          },
          complete: () => {
            unsubscribe$.next();
            unsubscribe$.complete();
          },
        });
    });
  }

  startCall(): void {
    const modalRef = this.modalService.open(OutGoingCallModalComponent, {
      centered: true,
      size: 'sm',
      backdrop: 'static',
    });
    const originUrl = `callId-${new Date().getTime()}`;
    const parts = window.location.href.split('/');
    const lastParam = parts[parts.length - 1];
    const data = {
      profilePicName:
        this.groupData?.ProfileImage || this.userChat?.profilePicName,
        userName: this.groupData?.groupName || this?.userChat.userName,
      roomId: this.userChat?.roomId || null,
      groupId: this.userChat?.groupId || null,
      notificationByProfileId: this.profileId,
      link: this.isOnCall ? lastParam : originUrl,
    };
    localStorage.setItem('callRoomId', this.userChat?.roomId);
    if (!data?.groupId) {
      data['notificationToProfileId'] = this.userChat.profileId;
    }
    var callSound = new Howl({
      src: [
        'https://s3.us-east-1.wasabisys.com/freedom-social/famous_ringtone.mp3',
      ],
      loop: true,
    });
    modalRef.componentInstance.calldata = data;
    modalRef.componentInstance.sound = callSound;
    modalRef.componentInstance.title = 'RINGING...';

    this.socketService?.startCall(data, (data: any) => {});
    // if (this.sharedService?.onlineUserList.includes(this.userChat?.profileId)) {
    // } else {
    // }
    let uuId = uuid();
    console.log(uuId);
    localStorage.setItem('uuId', uuId);
    if (this.userChat?.roomId) {
      const buzzRingData = {
        profilePicName:
          this.groupData?.ProfileImage ||
          this.sharedService?.userData?.profilePicName,
          userName:
          this.groupData?.groupName || this.sharedService?.userData?.userName,
        actionType: 'VC',
        notificationByProfileId: this.profileId,
        link: `${this.webUrl}dating-call/${originUrl}`,
        roomId: this.userChat?.roomId || null,
        groupId: this.userChat?.groupId || null,
        notificationDesc:
          this.groupData?.groupName ||
          this.sharedService?.userData?.userName + ' incoming call...',
        notificationToProfileId: this.userChat.profileId,
        domain: 'skin.toys',
        uuId: uuId,
      };
      this.customerService.startCallToBuzzRing(buzzRingData).subscribe({
        // next: (data: any) => {},
        error: (err) => {
          console.log(err);
        },
      });
    } else if (this.userChat?.groupId) {
      let groupMembers = this.groupData?.memberList
        ?.filter((item) => item.profileId !== this.profileId)
        ?.map((item) => item.profileId);
      const buzzRingGroupData = {
        profilePicName:
          this.groupData?.ProfileImage ||
          this.sharedService?.userData?.profilePicName,
          userName:
          this.groupData?.groupName || this.sharedService?.userData?.userName,
        actionType: 'VC',
        notificationByProfileId: this.profileId,
        link: `${this.webUrl}dating-call/${originUrl}`,
        roomId: this.userChat?.roomId || null,
        groupId: this.userChat?.groupId || null,
        notificationDesc:
          this.groupData?.groupName ||
          this.sharedService?.userData?.userName + ' incoming call...',
        notificationToProfileIds: groupMembers,
        domain: 'skin.toys',
        uuId: uuId,
      };
      this.customerService
        .startGroupCallToBuzzRing(buzzRingGroupData)
        .subscribe({
          // next: (data: any) => {},
          error: (err) => {
            console.log(err);
          },
        });
    }

    modalRef.result.then((res) => {
      if (!window.document.hidden) {
        if (res === 'missCalled') {
          this.chatObj.msgText = 'You have a missed call';
          this.sendMessage();
          const uuId = localStorage.getItem('uuId');

          const buzzRingData = {
            profilePicName:
              this.groupData?.ProfileImage || this.userChat?.profilePicName,
              userName: this.groupData?.groupName || this?.userChat.userName,
            actionType: 'DC',
            notificationByProfileId: this.profileId,
            notificationDesc:
              this.groupData?.groupName ||
              this?.userChat.userName + 'incoming call...',
            notificationToProfileId: this.userChat.profileId,
            domain: 'skin.toys',
            uuId: uuId,
          };
          this.customerService.startCallToBuzzRing(buzzRingData).subscribe({
            // next: (data: any) => {},
            error: (err) => {
              console.log(err);
            },
          });
        }
      }
    });
  }

  extractImageUrlFromContent(content: string) {
    const contentContainer = document.createElement('div');
    contentContainer.innerHTML = content;
    const imgTag = contentContainer.querySelector('img');
    if (imgTag) {
      const imgTitle = imgTag.getAttribute('title');
      const imgStyle = imgTag.getAttribute('style');
      const imageGif = imgTag
        .getAttribute('src')
        .toLowerCase()
        .endsWith('.gif');
      if (!imgTitle && !imgStyle && !imageGif) {
        const copyImage = imgTag.getAttribute('src');
        let copyImageTag = '<img\\s*src\\s*=\\s*""\\s*alt\\s*="">';
        const messageText = `<div>${content
          ?.replace(copyImage, '')
          // ?.replace(/\<br\>/gi, '')
          ?.replace(new RegExp(copyImageTag, 'g'), '')}</div>`;
        const base64Image = copyImage
          .trim()
          ?.replace(/^data:image\/\w+;base64,/, '');
        try {
          const binaryString = window.atob(base64Image);
          const uint8Array = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([uint8Array], { type: 'image/jpeg' });
          const fileName = `copyImage-${new Date().getTime()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          this.selectedFile = file;
          this.viewUrl = URL.createObjectURL(file);
        } catch (error) {
          console.error('Base64 decoding error:', error);
        }
        if (messageText !== '<div></div>') {
          return messageText;
        }
      } else if (imageGif) {
        return content;
      }
    } else {
      return content;
    }
    return null;
  }

  createGroup() {
    const modalRef = this.modalService.open(CreateGroupModalComponent, {
      centered: true,
      size: 'md',
    });
    if (!this.userChat.groupId) {
      const data = {
        Id: this.userChat.profileId,
        profilePicName: this.userChat.profilePicName,
        userName: this.userChat.userName,
        isUpdate: true,
      };
      modalRef.componentInstance.data = data;
    }
    modalRef.componentInstance.groupId = this.userChat?.groupId;
    modalRef.result.then((res) => {
      if (res) {
        this.socketService?.createGroup(res, (data: any) => {
          this.newRoomCreated.emit(true);
        });
      }
    });
  }

  getGroupDetails(id): void {
    this.socketService?.getGroupData({ groupId: id }, (data: any) => {
      this.groupData = data;
    });
  }

  groupEditDetails(data): void {
    const modalRef = this.modalService.open(EditGroupModalComponent, {
      centered: true,
      size: 'md',
    });
    modalRef.componentInstance.data = data;
    modalRef.componentInstance.groupId = this.userChat?.groupId;
    modalRef.result.then((res) => {
      if (res !== 'cancel') {
        console.log(res);
        if (Object.keys(res).includes('isUpdate')) {
          this.socketService?.createGroup(res, (data: any) => {
            this.groupData = data;
            this.newRoomCreated.emit(true);
          });
        } else {
          this.groupData = res;
        }
      } else {
        this.newRoomCreated.emit(true);
        this.userChat = {};
      }
    });
  }

  startTypingChat(isTyping: boolean) {
    clearTimeout(this.typingTimeout);
    const data = {
      groupId: this.userChat?.groupId,
      roomId: this.userChat?.roomId,
      profileId: this.profileId,
      isTyping: isTyping,
    };
    this.socketService?.startTyping(data, () => {});
    if (isTyping) {
      this.typingTimeout = setTimeout(() => this.startTypingChat(false), 3000);
    }
  }

  delayedStartTypingChat() {
    setTimeout(() => {
      this.startTypingChat(false);
    }, 3000);
  }

  notificationNavigation() {
    const isRead = localStorage.getItem('isRead');
    if (isRead === 'Y') {
      this.originalFavicon['href'] = '/assets/images/icon.jpg';
      this.sharedService.isNotify = false;
      // localStorage.setItem('isRead', 'Y');
    }
  }

  downloadMedia(data): void {
    const pdfLink = document.createElement('a');
    pdfLink.href = data;
    pdfLink.click();
    this.toastService.success('Download successfully initiated.');
  }

  openMediaGallery() {
    this.isGallerySidebarOpen = true;
    const offcanvasRef = this.offcanvasService.open(MediaGalleryComponent, {
      position: 'end',
      // panelClass: 'w-400-px',
    });
    offcanvasRef.componentInstance.userChat = this.userChat;
  }

  findUserStatus(id) {
    const index = this.sharedService.onlineUserList.findIndex(
      (ele) => ele.userId === id
    );
    this.isOnline = this.sharedService.onlineUserList[index] ? true : false;
  }

  profileStatus(status: string) {
    const data = {
      status: status,
      id: this.profileId,
    };
    const localUserData = JSON.parse(localStorage.getItem('userData'));
    this.socketService.switchOnlineStatus(data, (res) => {
      this.sharedService.userData.userStatus = res.status;
      localUserData.userStatus = res.status;
      localStorage.setItem('userData', JSON.stringify(localUserData));
    });
  }

  getMessagesBySocket() {
    const messageObj = {
      page: this.activePage,
      size: 25,
      roomId: this.userChat?.roomId || null,
      groupId: this.userChat?.groupId || null,
    };
    this.isLoading = true;
    this.socketService.getMessages(messageObj, (res) => {
      this.filterChatMessage(res);
      this.isLoading = false;
    });
  }

  filterChatMessage(data): void {
    if (!data?.data?.length && data?.pagination?.totalItems === 0) {
      this.filteredMessageList = [];
      return;
    }
    if (this.activePage === 1) {
      this.scrollToBottom();
    }
    if (data?.data.length > 0) {
      this.messageList = [...this.messageList, ...data.data];
      data.data.sort(
        (a, b) =>
          new Date(a?.createdDate).getTime() -
          new Date(b?.createdDate).getTime()
      );
      this.readMessagesBy = data?.readUsers?.filter(
        (item) => item.ID !== this.profileId
      );
    } else {
      this.hasMoreData = false;
    }
    if (this.activePage < data.pagination.totalPages) {
      this.hasMoreData = true;
    }
    if (this.filteredMessageList.length > 0) {
      this.chatContent.nativeElement.scrollTop = 48;
    }
    const array = new MessageDatePipe(this.encryptDecryptService).transform(
      data.data
    );
    // const uniqueDates = array.filter((dateObj) => {
    //   return !this.filteredMessageList.some(
    //     (existingDateObj) => existingDateObj.date === dateObj.date
    //   );
    // });

    let uniqueDates = [];
    array.forEach((dateObj) => {
      const existingDateObj = this.filteredMessageList.find(
        (existingDateObj) => existingDateObj.date === dateObj.date
      );
      if (existingDateObj) {
        existingDateObj.messages = existingDateObj.messages.concat(
          dateObj.messages
        );
        existingDateObj.messages.sort((a, b) => a.id - b.id);
      } else {
        uniqueDates.push(dateObj);
      }
    });
    this.filteredMessageList = [...uniqueDates, ...this.filteredMessageList];
    if (this.filteredMessageList[this.filteredMessageList.length - 1]) {
      const lastMessageList =
        this.filteredMessageList[this.filteredMessageList.length - 1].messages;
      this.readMessageRoom = lastMessageList[lastMessageList.length - 1].isRead;
    }
    if (this.userChat?.groupId) {
      this.socketService.socket.on('read-message-user', (data) => {
        this.readMessagesBy = data?.filter(
          (item) => item.ID !== this.profileId
        );
      });
      const date = moment(new Date()).utc();
      const oldChat = {
        profileId: this.profileId,
        groupId: this.userChat.groupId,
        date: moment(date).format('YYYY-MM-DD HH:mm:ss'),
      };
      this.socketService.switchChat(oldChat, (data) => {});
    } else {
      const ids = [];
      this.filteredMessageList.map((element) => {
        element.messages.map((e: any) => {
          if (e.isRead === 'N' && e.sentBy !== this.profileId) {
            return ids.push(e.id);
          } else {
            return e;
          }
        });
      });
      if (ids.length) {
        const data = {
          ids: ids,
          profileId: this.userChat.profileId,
        };
        this.socketService.readMessage(data, (res) => {
          return;
        });
      }
    }
    this.filteredMessageList.map((element) => {
      return (element.messages = element?.messages.filter(async (e: any) => {
        const url = e?.messageText || null;
        const text = url?.replace(/<br\s*\/?>|<[^>]*>/g, ' ');
        const matches = text?.match(
          /(?:https?:\/\/|www\.)[^\s<]+(?:\s|<br\s*\/?>|$)/
        );
        if (matches?.[0]) {
          e['metaData'] = await this.getMetaDataFromUrlStr(matches?.[0]);
        } else {
          return e;
        }
      }));
    });
  }

  updateProgress(): number {
    return (this.progressValue / 100) * 360;
  }

  openSearch(isSearch) {
    this.isSearch = !isSearch;
    this.clearSearchQuery();
    if (!isSearch) {
      setTimeout(() => {
        const searchInput = document.querySelector(
          '.searchChatBar .input-area input'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  }

  scrollToHighlighted(index: number) {
    this.messageElements.forEach((element) => {
      const currentHighlighted =
        element.nativeElement.querySelector('.highlighted');
      if (currentHighlighted) {
        this.renderer.removeClass(currentHighlighted, 'highlighted');
      }
    });
    const highlightedElements = this.messageElements
      .toArray()
      .filter(
        (element) => element.nativeElement.querySelector('.highlight') !== null
      );

    if (index >= 0 && index < highlightedElements.length) {
      const element = highlightedElements[index];
      const highlightedSpan = element.nativeElement.querySelector('.highlight');

      if (highlightedSpan) {
        this.renderer.addClass(highlightedSpan, 'highlighted');
        element.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }

  onSearch(event): void {
    // this.searchQuery = event.target.value;
    // console.log(event.target.value);
    if (event.target.value) {
      this.scrollToHighlighted(this.currentHighlightedIndex);
    } else {
      this.resetIndex();
      this.scrollToBottom();
    }
  }

  nextHighlighted() {
    const highlightedElements = this.messageElements
      .toArray()
      .filter(
        (element) => element.nativeElement.querySelector('.highlight') !== null
      );

    if (highlightedElements.length > 0) {
      this.currentHighlightedIndex =
        (this.currentHighlightedIndex - 1 + highlightedElements.length) %
        highlightedElements.length;
      this.scrollToHighlighted(this.currentHighlightedIndex);
    }
  }

  previousHighlighted() {
    const highlightedElements = this.messageElements
      .toArray()
      .filter(
        (element) => element.nativeElement.querySelector('.highlight') !== null
      );

    if (highlightedElements.length > 0) {
      this.currentHighlightedIndex =
        (this.currentHighlightedIndex + 1) % highlightedElements.length;
      // console.log(this.currentHighlightedIndex);

      this.scrollToHighlighted(this.currentHighlightedIndex);
    }
  }

  resetIndex() {
    this.currentHighlightedIndex = -1;
  }

  clearSearchQuery(): void {
    this.searchQuery = '';
  }

  onScroll(event: any): void {
    const element = event.target;
    if (element.scrollTop < 100 && this.hasMoreData && !this.isLoading) {
      this.loadMoreChats();
    }
  }
}
