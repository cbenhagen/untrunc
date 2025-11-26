/*
	Untrunc - file.cpp

	Untrunc is GPL software; you can freely distribute,
	redistribute, modify & use under the terms of the GNU General
	Public License; either version 2 or its successor.

	Untrunc is distributed under the GPL "AS IS", without
	any warranty; without the implied warranty of merchantability
	or fitness for either an expressed or implied particular purpose.

	Please see the included GNU General Public License (GPL) for
	your rights and further details; see the file COPYING. If you
	cannot, write to the Free Software Foundation, 59 Temple Place
	Suite 330, Boston, MA 02111-1307, USA.  Or www.fsf.org

	Copyright 2010 Federico Ponchio

							*/

#include "file.h"
#include <string>
#include <cstring>
#include <iostream>

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>
#include <libgen.h>

#include "common.h"

using namespace std;

// Static members for streaming reads
ReadCallback FileRead::s_read_callback = nullptr;
off_t FileRead::s_read_file_size = 0;

FileRead::FileRead(const string& filename) {
	open(filename);
}

FileRead::~FileRead() {
	if(buffer_) free(buffer_);
	if(file_) fclose(file_);
}

void FileRead::open(const string& filename) {
	filename_ = filename;
	
	// Check if streaming mode is enabled for this file
	use_streaming_ = (s_read_callback != nullptr && s_read_file_size > 0);
	
	if (use_streaming_) {
		// Streaming mode - use JS callback for reads
		file_ = nullptr;
		size_ = s_read_file_size;
		buffer_ = (uchar*) malloc(buf_size_);
		// Fill initial buffer
		size_t read = s_read_callback(0, buffer_, buf_size_);
		(void)read;  // Suppress unused warning
	} else {
		// Normal file mode
		file_ = my_open(filename.c_str(), "rb");
		if (!file_) throw("Could not open file '" + filename + "': " + strerror(errno));

		fseeko(file_, 0L, SEEK_END);
		size_ = ftello(file_);
		fseeko(file_, 0L, SEEK_SET);

		if (!isRegularFile(fileno(file_))) throw("not a regular file: " + filename);

		buffer_ = (uchar*) malloc(buf_size_);
		fread(buffer_, 1, buf_size_, file_);
	}
}

void FileRead::seek(off_t p) {
	if (p < buf_begin_ || p >= buf_begin_ + buf_size_){
		fillBuffer(p);
	} else
		buf_off_ = p - buf_begin_;
}

void FileRead::seekSafe(off_t p) {
	seek(min(p, size_));
}

off_t FileRead::pos() {
	return buf_begin_ + buf_off_;
}

bool FileRead::atEnd() {
	return pos() >= size_;
}

size_t FileRead::fillBuffer(off_t location) {
	off_t avail = (buf_begin_+buf_size_) - location;
	off_t buf_loc = location - buf_begin_;

	buf_begin_ = location;
	buf_off_ = 0;
	
	if (use_streaming_ && s_read_callback) {
		// Streaming mode - read via JS callback
		if (avail < 0 || avail >= buf_size_) {
			return s_read_callback(location, buffer_, buf_size_);
		} else if (avail > 0) {
			memmove(buffer_, buffer_+buf_loc, buf_size_-buf_loc);
		}
		return s_read_callback(location + avail, buffer_+avail, buf_size_-avail);
	} else {
		// Normal file mode
		if (avail < 0 || avail >= buf_size_) {
			fseeko(file_, location, SEEK_SET);
			int n = fread(buffer_, 1, buf_size_, file_);
			return n;
		} else if (avail > 0) {
			memmove(buffer_, buffer_+buf_loc, buf_size_-buf_loc);
		}
		int n = fread(buffer_+avail, 1, buf_size_-avail, file_);
		return n;
	}
}

size_t FileRead::readBuffer(uchar* dest, size_t size, size_t n) {
	logg(VV, "requests: ", size*n, " at offset : ", buf_off_, '\n');
	size_t total = size*n;
	size_t avail = buf_size_ - buf_off_;
	size_t nread = 0;
	if (avail < total) {
		logg(VV, "reallocating the file buffer\n");
		memcpy(dest, buffer_+buf_off_, avail);
		nread = avail;
		total -= avail;
		buf_off_ = buf_size_;
		if (total >= to_uint(buf_size_)){
			size_t x = fread(dest+nread, 1, total, file_);
			nread += x;
			fillBuffer(ftello(file_));
		} else {
			size_t x = min(fillBuffer(buf_begin_+buf_off_), total);
			memcpy(dest+nread, buffer_, x);
			buf_off_ += x;
			nread += x;
		}
	} else {
		memcpy(dest, buffer_+buf_off_, total);
		buf_off_ += total;
		nread = total;
	}
	return nread/size;
}

uint FileRead::readInt() {
	int value;
	int n = readBuffer((uchar*)&value, sizeof(int), 1);
	if(n != 1) throw "Could not read integer";
	return swap32(value);
}

int64_t FileRead::readInt64() {
	int64_t value;
	int n = readBuffer((uchar*)&value, sizeof(value), 1);
	if(n != 1)
		throw "Could not read int64";

	return swap64(value);
}

string FileRead::getString(size_t n) {
	string r;
	r.resize(n);
	readChar(&r[0], n);
	return r;
}

void FileRead::readChar(char *dest, size_t n) {
	size_t len = readBuffer((uchar*)dest, sizeof(char), n);
	if(len != n){
		cout << "expected " << n << " but got " << len << '\n';
		throw "Could not read chars";
	}
}

vector<uchar> FileRead::read(size_t n) {
	vector<uchar> dest(n);
	size_t len = readBuffer(&*dest.begin(), 1, n);
	if(len != n)
		throw "Could not read at position";
	return dest;
}

const uchar* FileRead::getPtr(int size_requested) {
	// check if requested size exceeds buffer
	if (buf_off_ + size_requested > buf_size_){
		logg(VV, "size_requested: ", size_requested, '\n');
		fillBuffer(buf_begin_+buf_off_);
	}
	return buffer_+buf_off_;
}

const uchar* FileRead::getPtr2(int size_requested) {
	auto ret = getPtr(size_requested);
	buf_off_ += size_requested;
	return ret;
}

const uchar* FileRead::getPtrAt(off_t pos, int size_requested) {
	seek(pos);
	auto ret = getPtr(size_requested);
	buf_off_ += size_requested;
	return ret;
}

const uchar* FileRead::getFragment(off_t off, int size) {
	seek(off);
	return getPtr(size);
}

bool FileRead::isRegularFile(int fd) {
	struct stat s;
	fstat(fd, &s);
	return S_ISREG(s.st_mode);
}

bool FileRead::alreadyExists(const string& fn) {
	FILE *f;
	if ((f = my_open(fn.c_str(), "r"))) {
		fclose(f);
		return 1;
	}
	return 0;
}


// Static members for streaming
WriteCallback FileWrite::s_write_callback = nullptr;
off_t FileWrite::s_stream_pos = 0;
std::vector<uchar> FileWrite::s_stream_buffer;

// Buffer data and flush when full
void FileWrite::bufferWrite(const uchar* data, size_t size) {
	// Reserve buffer on first use
	if (s_stream_buffer.capacity() < STREAM_BUFFER_SIZE) {
		s_stream_buffer.reserve(STREAM_BUFFER_SIZE);
	}
	
	size_t offset = 0;
	while (offset < size) {
		size_t space = STREAM_BUFFER_SIZE - s_stream_buffer.size();
		size_t to_copy = min(space, size - offset);
		
		s_stream_buffer.insert(s_stream_buffer.end(), data + offset, data + offset + to_copy);
		offset += to_copy;
		
		// Flush when buffer is full
		if (s_stream_buffer.size() >= STREAM_BUFFER_SIZE) {
			flush();
		}
	}
	s_stream_pos += size;
}

void FileWrite::flush() {
	if (use_streaming_ && s_write_callback && !s_stream_buffer.empty()) {
		s_write_callback(s_stream_buffer.data(), s_stream_buffer.size());
		s_stream_buffer.clear();
	}
}

FileWrite::FileWrite(const string& filename) {
	use_streaming_ = (s_write_callback != nullptr);
	
	if (use_streaming_) {
		file_ = nullptr;
		s_stream_pos = 0;
		s_stream_buffer.clear();
	} else {
		file_ = my_open(filename.c_str(), "wb");
		if(!file_)
			throw "Could not create file '" + filename + "': " + strerror(errno);
	}
}

FileWrite::~FileWrite() {
	if (use_streaming_) {
		flush();  // Flush any remaining data
	}
	if(file_) fclose(file_);
}

off_t FileWrite::pos() {
	if (use_streaming_) return s_stream_pos;
	return ftello(file_);
}

int FileWrite::writeInt(int n) {
	n = swap32(n);
	if (use_streaming_) {
		bufferWrite((const uchar*)&n, sizeof(int));
	} else {
		fwrite(&n, sizeof(int), 1, file_);
	}
	return 4;
}

int FileWrite::writeInt64(int64_t n) {
	n = swap64(n);
	if (use_streaming_) {
		bufferWrite((const uchar*)&n, sizeof(n));
	} else {
		fwrite(&n, sizeof(n), 1, file_);
	}
	return 8;
}

int FileWrite::writeChar(const char *source, size_t n) {
	if (use_streaming_) {
		bufferWrite((const uchar*)source, n);
	} else {
		fwrite(source, 1, n, file_);
	}
	return n;
}

int FileWrite::writeChar(const uchar *source, size_t n) {
	if (use_streaming_) {
		bufferWrite(source, n);
	} else {
		fwrite(source, 1, n, file_);
	}
	return n;
}

int FileWrite::write(vector<uchar> &v) {
	if (use_streaming_) {
		bufferWrite(&*v.begin(), v.size());
	} else {
		fwrite(&*v.begin(), 1, v.size(), file_);
	}
	return v.size();
}

void FileWrite::copyRange(FileRead& fin, size_t a, size_t b) {
	fin.seek(a);
	size_t n = b - a;
#ifdef __EMSCRIPTEN__
	size_t buff_sz = 4*(1<<20);  // 4MB chunks for WASM (reduce overhead)
#else
	size_t buff_sz = 1<<16;  // 64KB for native
#endif
	while (n) {
		if (!use_streaming_) cout << n << string(15, ' ') << '\r';
		auto to_read = min(buff_sz, n);
		auto p = fin.getPtr2(to_read);
		if (use_streaming_) {
			bufferWrite(p, to_read);
		} else {
			assert(to_read == fwrite(p, 1, to_read, file_));
		}
		n -= to_read;
	}
}

void FileWrite::copyN(FileRead& fin, size_t start_off, size_t n) {
	copyRange(fin, start_off, start_off + n);
}

bool isdir(const string& path) {
	struct stat st;
	return (stat(path.c_str(), &st) == 0) && (st.st_mode & S_IFDIR);
}

string myBasename(string path) {
	// basename may modifies its argument
	return basename(&path[0]);
}
